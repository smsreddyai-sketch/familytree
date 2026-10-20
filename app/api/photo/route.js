import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { isBlobUrl } from '@/lib/validate';

export const dynamic = 'force-dynamic';

// Serves photos through this site so only logged-in family can load them,
// and so the PDF export can draw them (same-origin images).
export async function GET(request) {
  try {
    const { error } = await requireRole(request, 'viewer');
    if (error) return error;

    const src = new URL(request.url).searchParams.get('src') || '';
    if (!isBlobUrl(src)) return NextResponse.json({ error: 'Invalid photo.' }, { status: 400 });

    const upstream = await fetch(src);
    if (!upstream.ok) return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });

    return new NextResponse(upstream.body, {
      headers: {
        'content-type': upstream.headers.get('content-type') || 'image/jpeg',
        'cache-control': 'private, max-age=86400',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
