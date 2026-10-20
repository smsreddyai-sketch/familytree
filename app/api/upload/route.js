import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') || 'avatar.png';
    
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      // Return a stock profile if credentials aren't deployed to Vercel dashboard yet
      return NextResponse.json({ url: 'https://unsplash.com' });
    }

    const blob = await put(filename, request.body, {
      access: 'public',
    });

    return NextResponse.json(blob);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
