import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { MEMBER_COOKIE, safeMemberNext } from '@/lib/auth/member';

/** 회원 로그아웃(폼 POST). 관리자 세션은 건드리지 않는다 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const next = safeMemberNext(form?.get('next')?.toString());
  (await cookies()).delete(MEMBER_COOKIE);
  return NextResponse.redirect(new URL(next, req.nextUrl.origin), { status: 303 });
}
