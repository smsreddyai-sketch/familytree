import { NextResponse } from 'next/server';
import { isOwner, sessionEmail, treesFor } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const email = sessionEmail(request);
    const trees = email ? await treesFor(email) : [];
    if (!email || (!trees.length && !isOwner(email))) return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
    return NextResponse.json({ email, isOwner: isOwner(email), trees });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
