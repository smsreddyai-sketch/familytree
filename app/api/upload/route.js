import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

const ALLOWED_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
// Vercel rejects request bodies over 4.5 MB; the form shrinks photos well below this first.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request) {
  try {
    const { error } = await requireRole(request, 'editor');
    if (error) return error;

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Photo storage not connected. Add Blob in the Vercel Storage tab, then redeploy.' }, { status: 500 });
    }

    const contentType = (request.headers.get('content-type') || '').split(';')[0];
    const ext = ALLOWED_TYPES[contentType];
    if (!ext) return NextResponse.json({ error: 'Only JPG, PNG or WebP photos are allowed.' }, { status: 400 });

    const data = Buffer.from(await request.arrayBuffer());
    if (data.length === 0) return NextResponse.json({ error: 'Empty file.' }, { status: 400 });
    if (data.length > MAX_BYTES) return NextResponse.json({ error: 'Photo is too large (max 4 MB).' }, { status: 413 });

    const blob = await put(`members/photo.${ext}`, data, {
      access: 'public',
      contentType,
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
