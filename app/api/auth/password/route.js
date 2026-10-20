import { NextResponse } from 'next/server';
import { redis } from '@/lib/db';
import { loginMode, normalizeEmail, roleFor, safeEqual, setSessionCookie } from '@/lib/auth';

const MAX_FAILURES = 10;
const LOCK_SECONDS = 15 * 60;

// Email + shared family password login (used while Gmail codes are not set up).
// The email must still be on the family list, so roles work exactly as with codes.
export async function POST(request) {
  try {
    if (loginMode() !== 'password') return NextResponse.json({ error: 'Please log in with the emailed code.' }, { status: 400 });

    const expected = process.env.SITE_PASSWORD;
    if (!expected) return NextResponse.json({ error: 'SITE_PASSWORD is not set in Vercel environment variables.' }, { status: 500 });

    const body = await request.json();
    const email = normalizeEmail(body.email);
    if (!email) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });

    const failKey = `ft:pw-fail:${email}`;
    const failures = Number(await redis().get(failKey)) || 0;
    if (failures >= MAX_FAILURES) {
      return NextResponse.json({ error: 'Too many wrong tries. Please wait 15 minutes.' }, { status: 429 });
    }

    const role = await roleFor(email);
    if (!role || !safeEqual(String(body.password || ''), expected)) {
      const count = await redis().incr(failKey);
      if (count === 1) await redis().expire(failKey, LOCK_SECONDS);
      const error = role ? 'Wrong family password.' : 'This email is not on the family list. Ask the family admin to add you.';
      return NextResponse.json({ error }, { status: role ? 400 : 403 });
    }

    await redis().del(failKey);
    return setSessionCookie(NextResponse.json({ email, role }), email);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
