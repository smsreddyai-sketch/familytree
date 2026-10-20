import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { KEYS, getAll, getOne, redis } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { personFields } from '@/lib/validate';

const newUnion = partnerIds => ({ id: randomUUID(), partnerIds, status: 'married', createdAt: Date.now() });

const fail = (message, status = 400) => NextResponse.json({ error: message }, { status });

// Adds a person. `relation` says where they go in the tree:
//   { type: 'root' }                         first ancestor or unconnected person
//   { type: 'child', parentId, unionId? }    child of a couple (unionId) or of one parent
//   { type: 'spouse', personId }             husband / wife of an existing person
//   { type: 'parent', childId }              father / mother of an existing person
export async function POST(request) {
  try {
    const { error } = await requireRole(request, 'editor');
    if (error) return error;

    const body = await request.json();
    let fields;
    try {
      fields = personFields(body, { requireName: true });
    } catch (e) {
      return fail(e.message);
    }

    const now = Date.now();
    const person = {
      id: randomUUID(),
      gender: 'other', isAlive: true, birthYear: null, deathYear: null,
      occupation: '', location: '', socialMedia: '', notes: '', photoUrl: '',
      ...fields,
      parentUnionId: null,
      createdAt: now,
      updatedAt: now,
    };

    const relation = body.relation || { type: 'root' };
    const tx = redis().multi();

    if (relation.type === 'child') {
      const parent = await getOne(KEYS.people, relation.parentId);
      if (!parent) return fail('Parent not found.', 404);
      let union = null;
      if (relation.unionId) {
        union = await getOne(KEYS.unions, relation.unionId);
        if (!union || !union.partnerIds.includes(parent.id)) return fail('Marriage not found.', 404);
      } else {
        union = newUnion([parent.id]);
        tx.hset(KEYS.unions, { [union.id]: union });
      }
      person.parentUnionId = union.id;
    } else if (relation.type === 'spouse') {
      const partner = await getOne(KEYS.people, relation.personId);
      if (!partner) return fail('Person not found.', 404);
      // If children were added before the spouse, put the spouse into that existing one-parent family.
      const unions = await getAll(KEYS.unions);
      const single = unions.find(u => u.partnerIds.length === 1 && u.partnerIds[0] === partner.id);
      const union = single ? { ...single, partnerIds: [partner.id, person.id], status: 'married' } : newUnion([partner.id, person.id]);
      tx.hset(KEYS.unions, { [union.id]: union });
    } else if (relation.type === 'parent') {
      const child = await getOne(KEYS.people, relation.childId);
      if (!child) return fail('Person not found.', 404);
      if (child.parentUnionId) {
        const union = await getOne(KEYS.unions, child.parentUnionId);
        if (!union) return fail('Parents not found.', 404);
        if (union.partnerIds.length >= 2) return fail(`${child.name} already has two parents.`);
        tx.hset(KEYS.unions, { [union.id]: { ...union, partnerIds: [...union.partnerIds, person.id] } });
      } else {
        const union = newUnion([person.id]);
        tx.hset(KEYS.unions, { [union.id]: union });
        tx.hset(KEYS.people, { [child.id]: { ...child, parentUnionId: union.id, updatedAt: now } });
      }
    } else if (relation.type !== 'root') {
      return fail('Unknown relation.');
    }

    tx.hset(KEYS.people, { [person.id]: person });
    await tx.exec();

    return NextResponse.json({ success: true, person });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
