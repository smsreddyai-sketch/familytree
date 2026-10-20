import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { KEYS, getOne } from '@/lib/db';

export const SESSION_COOKIE = 'ft_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const ROLE_RANK = { viewer: 1, editor: 2, admin: 3 };
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

// Owners (from the OWNER_EMAILS env var) are always admins, so they can never lock themselves out.
function ownerEmails() {
  return (process.env.OWNER_EMAILS || '').split(',').map(normalizeEmail).filter(Boolean);
}

export async function roleFor(email) {
  if (ownerEmails().includes(email)) return 'admin';
  const user = await getOne(KEYS.users, email);
  return user && ROLE_RANK[user.role] ? user.role : null;
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

// Role is looked up on every request, so removing someone's access takes effect immediately.
export async function getUser(request) {
  const email = readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return null;
  const role = await roleFor(email);
  return role ? { email, role } : null;
}

// Returns { user } when allowed, or { error } holding the response to send back.
export async function requireRole(request, minRole) {
  const user = await getUser(request);
  if (!user) return { error: NextResponse.json({ error: 'Please log in.' }, { status: 401 }) };
  if (ROLE_RANK[user.role] < ROLE_RANK[minRole]) {
    return { error: NextResponse.json({ error: 'You do not have permission to do this.' }, { status: 403 }) };
  }
  return { user };
}

export function canEdit(role) {
  return ROLE_RANK[role] >= ROLE_RANK.editor;
}
