import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { ApiError, memberApi, type MemberApi } from '@/lib/api';
import { siteUrl } from '@/lib/site';
import { getMemberSession, MEMBER_COOKIE } from './member';

export const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * 회원 Route Handler 공통: 변경(PUT·DELETE)은 같은 출처만 받고, 세션이 없으면 401.
 * 백엔드가 세션을 거부하면(탈퇴·차단) 쿠키를 지워 헤더가 로그아웃 상태로 돌아가게 한다.
 * 쿠키는 SameSite=Lax라 다른 사이트의 PUT·DELETE에는 실리지 않지만, 출처도 한 번 더 확인한다.
 */
export async function withMember<T>(req: NextRequest, run: (me: MemberApi) => Promise<T>): Promise<NextResponse> {
  if (req.method !== 'GET' && !sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: NO_STORE });
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });
  try {
    return NextResponse.json(await run(memberApi(session.token)), { headers: NO_STORE });
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) (await cookies()).delete(MEMBER_COOKIE);
      if ([401, 404, 409, 422].includes(e.status)) return NextResponse.json({ error: e.code }, { status: e.status, headers: NO_STORE });
    }
    console.error('member request failed', e);
    return NextResponse.json({ error: 'server_error' }, { status: 502, headers: NO_STORE });
  }
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  return origin === req.nextUrl.origin || origin === new URL(siteUrl()).origin;
}
