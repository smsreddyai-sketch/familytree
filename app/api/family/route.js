import { NextResponse } from 'next/server';
import { getMembers, addMember } from '@/lib/db';
import { checkAdmin } from '@/lib/auth';

// Without this, Next.js caches GET at build time and new members never show up.
export const dynamic = 'force-dynamic';

const clean = (value, max = 100) => String(value || '').trim().slice(0, max);

function cleanLink(value) {
  const link = clean(value, 500);
  if (!link) return '';
  try {
    const parsed = new URL(link);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}

function cleanImageUrl(value) {
  const link = clean(value, 500);
  if (!link) return '';
  try {
    const parsed = new URL(link);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.blob.vercel-storage.com') ? parsed.href : null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    return NextResponse.json(await getMembers());
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const denied = checkAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();

    const name = clean(body.name);
    if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

    const socialMedia = cleanLink(body.socialMedia);
    if (socialMedia === null) {
      return NextResponse.json({ error: 'Social link must start with http:// or https://' }, { status: 400 });
    }

    const imageUrl = cleanImageUrl(body.imageUrl);
    if (imageUrl === null) return NextResponse.json({ error: 'Invalid photo link.' }, { status: 400 });

    const generation = Math.min(5, Math.max(1, parseInt(body.generation) || 1));

    const newMember = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      name,
      generation,
      occupation: clean(body.occupation),
      location: clean(body.location),
      socialMedia,
      imageUrl,
      spouseName: clean(body.spouseName)
    };

    await addMember(newMember);

    return NextResponse.json({ success: true, member: newMember });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
