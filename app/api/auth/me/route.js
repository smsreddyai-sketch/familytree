import { NextResponse } from 'next/server';
import { getUser, isOwner } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
    return NextResponse.json({ ...user, isOwner: isOwner(user.email) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
