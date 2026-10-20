import { NextResponse } from 'next/server';
import { KEYS, getAll, getOne, redis } from '@/lib/db';
import { ROLES, isOwner, normalizeEmail, ownerEmails, requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Who can open the current tree (x-tree-id). Each tree has its own list; site owners are admins everywhere.
export async function GET(request) {
  try {
    const { treeId, error } = await requireRole(request, 'admin');
    if (error) return error;

    const users = (await getAll(KEYS.users(treeId))).filter(u => !isOwner(u.email));
    const list = [...ownerEmails().map(email => ({ email, role: 'admin', owner: true })), ...users]
      .sort((a, b) => Number(!!b.owner) - Number(!!a.owner) || a.email.localeCompare(b.email));
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Adds an email or changes its role.
export async function POST(request) {
  try {
    const { user, treeId, error } = await requireRole(request, 'admin');
    if (error) return error;

    const body = await request.json();
    const email = normalizeEmail(body.email);
    if (!email) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    if (!ROLES.includes(body.role)) return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    if (isOwner(email)) return NextResponse.json({ error: 'The site owner is always an admin.' }, { status: 400 });

    const record = { email, role: body.role, addedBy: user.email, addedAt: Date.now() };
    if (body.role === 'branch') {
      const person = body.branchId ? await getOne(KEYS.people(treeId), body.branchId) : null;
      if (!person) return NextResponse.json({ error: 'Please choose whose family this person may edit.' }, { status: 400 });
      record.branchId = person.id;
    }
    await redis().hset(KEYS.users(treeId), { [email]: record });
    return NextResponse.json({ success: true, user: record });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { treeId, error } = await requireRole(request, 'admin');
    if (error) return error;

    const email = normalizeEmail(new URL(request.url).searchParams.get('email'));
    if (!email) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    if (isOwner(email)) return NextResponse.json({ error: 'The site owner cannot be removed.' }, { status: 400 });

    await redis().hdel(KEYS.users(treeId), email);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
