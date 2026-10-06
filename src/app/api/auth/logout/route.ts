import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.redirect(new URL('/ko', req.nextUrl.origin), { status: 303 });
}
