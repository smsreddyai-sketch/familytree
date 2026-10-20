import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { KEYS, getAll, getOne, redis } from '@/lib/db';
import { editCheck, outsideBranch, requireRole } from '@/lib/auth';
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
    const { user, treeId, error } = await requireRole(request, 'branch');
    if (error) return error;

    const body = await request.json();
    const relation = body.relation || { type: 'root' };

    // A family editor can add children and spouses inside their branch, and parents of anyone
    // in it except the person the branch starts from (those parents belong to the wider family).
    if (user.role === 'branch') {
      const mayEdit = await editCheck(user, treeId);
      const anchor = { child: relation.parentId, spouse: relation.personId, parent: relation.childId }[relation.type];
      if (!anchor || !mayEdit(anchor) || (relation.type === 'parent' && anchor === user.branchId)) return outsideBranch();
    }
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

    const tx = redis().multi();

    if (relation.type === 'child') {
      const parent = await getOne(KEYS.people(treeId), relation.parentId);
      if (!parent) return fail('Parent not found.', 404);
      let union = null;
      if (relation.unionId) {
        union = await getOne(KEYS.unions(treeId), relation.unionId);
        if (!union || !union.partnerIds.includes(parent.id)) return fail('Marriage not found.', 404);
      } else {
        union = newUnion([parent.id]);
        tx.hset(KEYS.unions(treeId), { [union.id]: union });
      }
      person.parentUnionId = union.id;
    } else if (relation.type === 'spouse') {
      const partner = await getOne(KEYS.people(treeId), relation.personId);
      if (!partner) return fail('Person not found.', 404);
      // If children were added before the spouse, put the spouse into that existing one-parent family.
      const unions = await getAll(KEYS.unions(treeId));
      const single = unions.find(u => u.partnerIds.length === 1 && u.partnerIds[0] === partner.id);
      const union = single ? { ...single, partnerIds: [partner.id, person.id], status: 'married' } : newUnion([partner.id, person.id]);
      tx.hset(KEYS.unions(treeId), { [union.id]: union });
    } else if (relation.type === 'parent') {
      const child = await getOne(KEYS.people(treeId), relation.childId);
      if (!child) return fail('Person not found.', 404);
      if (child.parentUnionId) {
        const union = await getOne(KEYS.unions(treeId), child.parentUnionId);
        if (!union) return fail('Parents not found.', 404);
        if (union.partnerIds.length >= 2) return fail(`${child.name} already has two parents.`);
        tx.hset(KEYS.unions(treeId), { [union.id]: { ...union, partnerIds: [...union.partnerIds, person.id] } });
      } else {
        const union = newUnion([person.id]);
        tx.hset(KEYS.unions(treeId), { [union.id]: union });
        tx.hset(KEYS.people(treeId), { [child.id]: { ...child, parentUnionId: union.id, updatedAt: now } });
      }
    } else if (relation.type !== 'root') {
      return fail('Unknown relation.');
    }

    tx.hset(KEYS.people(treeId), { [person.id]: person });
    await tx.exec();

    return NextResponse.json({ success: true, person });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
