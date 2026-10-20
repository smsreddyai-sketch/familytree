import { randomUUID } from 'crypto';
import { del } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { KEYS, MAIN_TREE, getAll, getTreeInfo, redis } from '@/lib/db';
import { isOwner, normalizeEmail, requireLogin, requireRole } from '@/lib/auth';
import { isBlobUrl } from '@/lib/validate';

const fail = (message, status = 400) => NextResponse.json({ error: message }, { status });

const cleanName = value => String(value || '').trim().slice(0, 80);

// Creates a new family tree (site owners only), optionally handing it to an admin who runs it.
export async function POST(request) {
  try {
    const { user, error } = await requireLogin(request);
    if (error) return error;
    if (!isOwner(user.email)) return fail('Only the site owner can create new family trees.', 403);

    const body = await request.json();
    const name = cleanName(body.name);
    if (!name) return fail('Please enter a name for the family tree.');
    const adminEmail = body.adminEmail ? normalizeEmail(body.adminEmail) : '';
    if (body.adminEmail && !adminEmail) return fail('Please enter a valid email address for the tree owner.');

    const tree = { id: randomUUID(), name, createdBy: user.email, createdAt: Date.now() };
    const tx = redis().multi();
    tx.hset(KEYS.trees, { [tree.id]: tree });
    if (adminEmail && !isOwner(adminEmail)) {
      tx.hset(KEYS.users(tree.id), { [adminEmail]: { email: adminEmail, role: 'admin', addedBy: user.email, addedAt: Date.now() } });
    }
    await tx.exec();
    return NextResponse.json({ success: true, tree });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Renames the current tree (its admins).
export async function PATCH(request) {
  try {
    const { treeId, error } = await requireRole(request, 'admin');
    if (error) return error;

    const name = cleanName((await request.json()).name);
    if (!name) return fail('Please enter a name for the family tree.');

    const tree = { ...(await getTreeInfo(treeId)), name };
    await redis().hset(KEYS.trees, { [treeId]: tree });
    return NextResponse.json({ success: true, tree });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Deletes the current tree with all its people, photos and access list (site owners only).
export async function DELETE(request) {
  try {
    const { user, treeId, error } = await requireRole(request, 'admin');
    if (error) return error;
    if (!isOwner(user.email)) return fail('Only the site owner can delete a family tree.', 403);
    if (treeId === MAIN_TREE) return fail('The first family tree cannot be deleted.');

    const people = await getAll(KEYS.people(treeId));
    const tx = redis().multi();
    tx.del(KEYS.people(treeId), KEYS.unions(treeId), KEYS.users(treeId));
    tx.hdel(KEYS.trees, treeId);
    await tx.exec();

    const photos = people.map(p => p.photoUrl).filter(url => url && isBlobUrl(url));
    if (photos.length) await del(photos).catch(e => console.error('Could not delete photos', e));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
