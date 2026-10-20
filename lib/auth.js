import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { KEYS, MAIN_TREE, getOne, getTree, getTreeInfo, listTrees } from '@/lib/db';
import { branchMembers } from '@/lib/branch';

export const SESSION_COOKIE = 'ft_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// 'branch' = family editor: can change only one person's branch of the tree (see lib/branch.js).
const ROLE_RANK = { viewer: 1, branch: 2, editor: 3, admin: 4 };
export const ROLES = Object.keys(ROLE_RANK);

export function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200 ? email : '';
}

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET is not set in Vercel environment variables.');
  return value;
}

export function hmac(data) {
  return createHmac('sha256', secret()).update(data).digest('base64url');
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

// Site owners (from the OWNER_EMAILS env var) are admins of every tree, so they can never lock themselves out.
export function ownerEmails() {
  return (process.env.OWNER_EMAILS || '').split(',').map(normalizeEmail).filter(Boolean);
}

// { role, branchId } for this email in this tree, or null. branchId is set only for family editors.
export async function accessFor(email, treeId) {
  if (ownerEmails().includes(email)) return { role: 'admin', branchId: null };
  const user = await getOne(KEYS.users(treeId), email);
  if (!user || !ROLE_RANK[user.role]) return null;
  return { role: user.role, branchId: user.role === 'branch' ? user.branchId || null : null };
}

// The trees this email can open, each with its role there.
export async function treesFor(email) {
  const trees = await listTrees();
  const access = await Promise.all(trees.map(t => accessFor(email, t.id)));
  return trees.map((t, i) => access[i] && { id: t.id, name: t.name, ...access[i] }).filter(Boolean);
}

// For a family editor, returns a check "may this user change person X?"; everyone else with edit rights may change anyone.
export async function editCheck(user, treeId) {
  if (user.role !== 'branch') return () => true;
  const { people, unions } = await getTree(treeId);
  const members = branchMembers(people, unions, user.branchId);
  return personId => members.has(personId);
}

export const outsideBranch = () =>
  NextResponse.json({ error: 'You can only change your own family branch of the tree.' }, { status: 403 });

export async function hasAccess(email) {
  return isOwner(email) || (await treesFor(email)).length > 0;
}

export function isOwner(email) {
  return ownerEmails().includes(email);
}

// 'code': 6-digit code emailed from Gmail. 'password': email + shared family password (SITE_PASSWORD),
// used until Gmail sending is set up.
export function loginMode() {
  if (process.env.LOGIN_MODE === 'password' || process.env.LOGIN_MODE === 'code') return process.env.LOGIN_MODE;
  return process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD ? 'code' : 'password';
}

export function setSessionCookie(response, email) {
  response.cookies.set(SESSION_COOKIE, createSessionToken(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

export function createSessionToken(email) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + SESSION_MAX_AGE * 1000 })).toString('base64url');
  return `${payload}.${hmac(payload)}`;
}

function readSessionToken(token) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature || !safeEqual(signature, hmac(payload))) return null;
  try {
    const { email, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return exp > Date.now() ? email : null;
  } catch {
    return null;
  }
}

export function sessionEmail(request) {
  return readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

// Access is looked up on every request, so removing someone takes effect immediately.
export async function requireLogin(request) {
  const email = sessionEmail(request);
  if (!email || !(await hasAccess(email))) return { error: NextResponse.json({ error: 'Please log in.' }, { status: 401 }) };
  return { user: { email } };
}

// Which tree a request is about: the browser sends it in the x-tree-id header.
export const treeIdOf = request => request.headers.get('x-tree-id') || MAIN_TREE;

// Returns { user, treeId } when allowed in the request's tree, or { error } holding the response to send back.
export async function requireRole(request, minRole) {
  const email = sessionEmail(request);
  if (!email) return { error: NextResponse.json({ error: 'Please log in.' }, { status: 401 }) };
  const treeId = treeIdOf(request);
  if (!(await getTreeInfo(treeId))) return { error: NextResponse.json({ error: 'This family tree no longer exists.' }, { status: 404 }) };
  const access = await accessFor(email, treeId);
  if (!access) {
    const status = (await hasAccess(email)) ? 403 : 401;
    return { error: NextResponse.json({ error: status === 401 ? 'Please log in.' : 'You do not have access to this family tree.' }, { status }) };
  }
  if (ROLE_RANK[access.role] < ROLE_RANK[minRole]) {
    return { error: NextResponse.json({ error: 'You do not have permission to do this.' }, { status: 403 }) };
  }
  return { user: { email, ...access }, treeId };
}

