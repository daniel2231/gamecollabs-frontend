import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { ApiError, memberApi } from '@/lib/api';
import { getMemberSession, MEMBER_COOKIE } from '@/lib/auth/member';
import { siteUrl } from '@/lib/site';

/**
 * 회원 탈퇴(폼 POST): 백엔드에서 계정·저장·팔로우를 지우고 쿠키를 지운 뒤 홈으로 303.
 * 서버 액션 대신 폼 POST를 쓴다: 브라우저가 홈을 새로 불러야 헤더의 로그인 상태가 함께 바뀐다.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const locale = form?.get('locale') === 'en' ? 'en' : 'ko';
  const origin = req.headers.get('origin');
  if (origin !== req.nextUrl.origin && origin !== new URL(siteUrl()).origin) return new NextResponse('forbidden', { status: 403 });
  const session = await getMemberSession();
  if (session) {
    try {
      await memberApi(session.token).deleteMe();
    } catch (e) {
      // 이미 지워진 계정이면 쿠키만 지우면 된다
      if (!(e instanceof ApiError && e.status === 401)) {
        console.error('account deletion failed', e);
        return NextResponse.redirect(new URL(`/${locale}/account?error=delete_failed`, req.nextUrl.origin), { status: 303 });
      }
    }
  }
  (await cookies()).delete(MEMBER_COOKIE);
  return NextResponse.redirect(new URL(`/${locale}`, req.nextUrl.origin), { status: 303 });
}
