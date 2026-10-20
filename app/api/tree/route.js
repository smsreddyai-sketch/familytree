import { NextResponse } from 'next/server';
import { getTree } from '@/lib/db';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { error } = await requireRole(request, 'viewer');
    if (error) return error;
    return NextResponse.json(await getTree());
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
