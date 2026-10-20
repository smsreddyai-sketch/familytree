import { randomInt } from 'crypto';
import { NextResponse } from 'next/server';
import { KEYS, redis } from '@/lib/db';
import { hasAccess, hmac, loginMode, normalizeEmail } from '@/lib/auth';
import { sendLoginCode } from '@/lib/mail';

export async function POST(request) {
  try {
    if (loginMode() !== 'code') return NextResponse.json({ error: 'Email codes are turned off. Log in with the family password.' }, { status: 400 });

    const body = await request.json();
    const email = normalizeEmail(body.email);
    if (!email) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });

    if (!(await hasAccess(email))) {
      return NextResponse.json({ error: 'This email is not on the family list. Ask the family admin to add you.' }, { status: 403 });
    }

    const allowed = await redis().set(KEYS.otpCooldown(email), 1, { nx: true, ex: 60 });
    if (!allowed) {
      return NextResponse.json({ error: 'A code was just sent. Please wait a minute before asking again.' }, { status: 429 });
    }

    const code = String(randomInt(0, 1000000)).padStart(6, '0');
    await redis().set(KEYS.otp(email), { hash: hmac(`${email}:${code}`), attempts: 0 }, { ex: 600 });
    await sendLoginCode(email, code);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
