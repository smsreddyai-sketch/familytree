import { NextResponse } from 'next/server';
import { loginMode } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ mode: loginMode() });
}
