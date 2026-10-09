import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { oauthCallbackUrl, siteUrl } from '@/lib/site';

const STATE_COOKIE = 'ct_oauth_state';

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return new NextResponse('GITHUB_CLIENT_ID is not configured', { status: 500 });
  const next = safeNext(req.nextUrl.searchParams.get('next'));
  // GitHub OAuth 앱에는 콜백 주소가 하나뿐이다. www·*.vercel.app 등 다른 호스트로 들어오면
  // 정식 주소에서 다시 시작해야 state 쿠키와 redirect_uri가 같은 호스트가 된다.
  const canonical = new URL(siteUrl());
  if (req.nextUrl.origin !== canonical.origin && process.env.NODE_ENV === 'production') {
    const restart = new URL('/api/auth/github/login', canonical);
    restart.searchParams.set('next', next);
    return NextResponse.redirect(restart);
  }
  const state = crypto.randomUUID();
  (await cookies()).set(STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 600,
  });
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', oauthCallbackUrl());
  url.searchParams.set('scope', 'read:user');
  url.searchParams.set('state', state);
  url.searchParams.set('allow_signup', 'false');
  return NextResponse.redirect(url);
}

/** 오픈 리다이렉트 방지: 같은 사이트의 /ko/admin, /en/admin 경로만 허용 */
function safeNext(value: string | null): string {
  return value && /^\/(ko|en)\/admin(\/[\w\-/?=&.%]*)?$/.test(value) ? value : '/ko/admin';
}
