import { NextResponse } from 'next/server';
import { KEYS, redis } from '@/lib/db';
import { hmac, normalizeEmail, roleFor, safeEqual, setSessionCookie } from '@/lib/auth';

const MAX_ATTEMPTS = 5;

export async function POST(request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    const code = String(body.code || '').replace(/\D/g, '');
    const key = KEYS.otp(email);

    const record = email ? await redis().get(key) : null;
    if (!record) return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 });

    if (record.attempts >= MAX_ATTEMPTS) {
      await redis().del(key);
      return NextResponse.json({ error: 'Too many wrong tries. Please request a new code.' }, { status: 429 });
    }

    if (!safeEqual(record.hash, hmac(`${email}:${code}`))) {
      await redis().set(key, { ...record, attempts: record.attempts + 1 }, { keepTtl: true });
      return NextResponse.json({ error: 'Wrong code. Please check the email and try again.' }, { status: 400 });
    }

    await redis().del(key);
    const role = await roleFor(email);
    if (!role) return NextResponse.json({ error: 'Your access has been removed.' }, { status: 403 });

    return setSessionCookie(NextResponse.json({ email, role }), email);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
