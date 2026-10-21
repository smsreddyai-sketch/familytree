import { NextResponse } from 'next/server';
import { getTree } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { branchMembers, canSeePhone } from '@/lib/branch';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { user, treeId, error } = await requireRole(request, 'viewer');
    if (error) return error;

    // Private phone numbers never leave the server for people who may not see them.
    const { people, unions } = await getTree(treeId);
    const branch = user.role === 'branch' ? branchMembers(people, unions, user.branchId) : null;
    const visible = people.map(p =>
      !p.phone || canSeePhone(p, user.role, branch) ? p : { ...p, phone: '', phoneHidden: true }
    );
    return NextResponse.json({ people: visible, unions });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
