import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { ApiError, memberApi } from '@/lib/api';
import { getMemberSession, MEMBER_COOKIE } from '@/lib/auth/member';
import { siteUrl } from '@/lib/site';

/** 상세 페이지의 저장 버튼이 부른다: GET 저장 여부, PUT 저장, DELETE 해제 → `{ bookmarked }` */

const NO_STORE = { 'Cache-Control': 'private, no-store' };

async function handle(req: NextRequest, slug: string, action: 'get' | 'on' | 'off') {
  // 쿠키는 SameSite=Lax라 다른 사이트의 PUT·DELETE에는 실리지 않지만, 출처도 한 번 더 확인한다
  if (action !== 'get' && !sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: NO_STORE });
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });
  const me = memberApi(session.token);
  try {
    const bookmarked = action === 'get' ? await me.isBookmarked(slug) : await me.setBookmark(slug, action === 'on');
    return NextResponse.json({ bookmarked }, { headers: NO_STORE });
  } catch (e) {
    if (e instanceof ApiError) {
      // 탈퇴·차단으로 세션이 더는 통하지 않으면 쿠키도 지워 헤더가 로그아웃 상태로 돌아가게 한다
      if (e.status === 401) (await cookies()).delete(MEMBER_COOKIE);
      if ([401, 404, 409].includes(e.status)) return NextResponse.json({ error: e.code }, { status: e.status, headers: NO_STORE });
    }
    console.error('bookmark request failed', e);
    return NextResponse.json({ error: 'server_error' }, { status: 502, headers: NO_STORE });
  }
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  return origin === req.nextUrl.origin || origin === new URL(siteUrl()).origin;
}

type Ctx = RouteContext<'/api/me/bookmarks/[slug]'>;

export async function GET(req: NextRequest, ctx: Ctx) {
  return handle(req, (await ctx.params).slug, 'get');
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return handle(req, (await ctx.params).slug, 'on');
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return handle(req, (await ctx.params).slug, 'off');
}
