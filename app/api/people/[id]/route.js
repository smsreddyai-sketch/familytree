import { del } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { KEYS, getOne, getTree, redis } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { isBlobUrl, personFields } from '@/lib/validate';

async function deletePhoto(url) {
  if (!url || !isBlobUrl(url)) return;
  try {
    await del(url);
  } catch (e) {
    console.error('Could not delete photo', url, e);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { treeId, error } = await requireRole(request, 'editor');
    if (error) return error;

    const existing = await getOne(KEYS.people(treeId), params.id);
    if (!existing) return NextResponse.json({ error: 'Person not found.' }, { status: 404 });

    let fields;
    try {
      fields = personFields(await request.json());
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    const person = { ...existing, ...fields, updatedAt: Date.now() };
    await redis().hset(KEYS.people(treeId), { [person.id]: person });

    if ('photoUrl' in fields && existing.photoUrl && existing.photoUrl !== fields.photoUrl) {
      await deletePhoto(existing.photoUrl);
    }

    return NextResponse.json({ success: true, person });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Removes a person and their photo. Their children stay in the tree, linked to the other parent if there is one.
export async function DELETE(request, { params }) {
  try {
    const { treeId, error } = await requireRole(request, 'editor');
    if (error) return error;

    const person = await getOne(KEYS.people(treeId), params.id);
    if (!person) return NextResponse.json({ error: 'Person not found.' }, { status: 404 });

    const { people, unions } = await getTree(treeId);
    const tx = redis().multi();

    for (const union of unions.filter(u => u.partnerIds.includes(person.id))) {
      const remaining = union.partnerIds.filter(id => id !== person.id);
      const children = people.filter(p => p.parentUnionId === union.id);

      if (remaining.length === 0 || (remaining.length === 1 && children.length === 0)) {
        tx.hdel(KEYS.unions(treeId), union.id);
        for (const child of children) {
          tx.hset(KEYS.people(treeId), { [child.id]: { ...child, parentUnionId: null } });
        }
      } else {
        tx.hset(KEYS.unions(treeId), { [union.id]: { ...union, partnerIds: remaining } });
      }
    }

    tx.hdel(KEYS.people(treeId), person.id);
    await tx.exec();
    await deletePhoto(person.photoUrl);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
