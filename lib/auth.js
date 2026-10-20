import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

// Returns an error response if the request lacks the family password, otherwise null.
export function checkAdmin(request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD is not set in Vercel environment variables.' }, { status: 500 });
  }

  let given = '';
  try {
    given = decodeURIComponent(request.headers.get('x-admin-password') || '');
  } catch {}

  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Wrong family password.' }, { status: 401 });
  }
  return null;
}
