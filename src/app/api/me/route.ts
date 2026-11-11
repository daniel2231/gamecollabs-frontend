import { NextResponse } from 'next/server';
import { getMemberSession } from '@/lib/auth/member';

/**
 * 헤더의 로그인 상태. 공개 페이지는 정적(ISR)이라 쿠키를 읽지 않으므로 브라우저가 이 주소를 부른다.
 * 토큰만 확인하고 백엔드는 부르지 않는다.
 */
export async function GET() {
  const session = await getMemberSession();
  return NextResponse.json(
    { member: session ? { name: session.name, avatarUrl: session.avatarUrl } : null },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
