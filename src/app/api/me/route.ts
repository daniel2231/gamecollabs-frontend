import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ApiError, memberApi, type MemberState } from '@/lib/api';
import { getMemberSession, MEMBER_COOKIE } from '@/lib/auth/member';
import { NO_STORE } from '@/lib/auth/member-route';

/**
 * 로그인 상태와 저장·팔로우 목록(slug). 공개 페이지는 정적(ISR)이라 쿠키를 읽지 않으므로
 * 브라우저가 페이지마다 한 번 이 주소를 부르고, 헤더 메뉴와 모든 저장·팔로우 버튼이 이 응답을 나눠 쓴다.
 * 로그아웃 상태면 백엔드를 부르지 않는다.
 */
export async function GET() {
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ member: null, state: null }, { headers: NO_STORE });
  let state: MemberState | null = null;
  try {
    state = await memberApi(session.token).getState();
  } catch (e) {
    // 탈퇴·차단된 회원: 쿠키를 지우고 로그아웃 상태로
    if (e instanceof ApiError && e.status === 401) {
      (await cookies()).delete(MEMBER_COOKIE);
      return NextResponse.json({ member: null, state: null }, { headers: NO_STORE });
    }
    // 그 밖의 오류: 로그인 상태는 보여 주되 버튼은 '저장 안 됨'으로 그린다
    console.error('member state unavailable', e);
  }
  return NextResponse.json({ member: { name: session.name, avatarUrl: session.avatarUrl }, state }, { headers: NO_STORE });
}
