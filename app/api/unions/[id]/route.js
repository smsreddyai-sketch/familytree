import { NextResponse } from 'next/server';
import { KEYS, getOne, redis } from '@/lib/db';
import { editCheck, outsideBranch, requireRole } from '@/lib/auth';
import { UNION_STATUSES } from '@/lib/validate';

// Changes a marriage's status, e.g. to 'divorced'. Children stay linked to both parents.
export async function PATCH(request, { params }) {
  try {
    const { user, treeId, error } = await requireRole(request, 'branch');
    if (error) return error;

    const union = await getOne(KEYS.unions(treeId), params.id);
    if (!union) return NextResponse.json({ error: 'Marriage not found.' }, { status: 404 });
    const mayEdit = await editCheck(user, treeId);
    if (!union.partnerIds.some(mayEdit)) return outsideBranch();

    const { status } = await request.json();
    if (!UNION_STATUSES.includes(status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });

    const updated = { ...union, status };
    await redis().hset(KEYS.unions(treeId), { [union.id]: updated });
    return NextResponse.json({ success: true, union: updated });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
