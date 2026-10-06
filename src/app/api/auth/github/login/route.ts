import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

const STATE_COOKIE = 'ct_oauth_state';

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return new NextResponse('GITHUB_CLIENT_ID is not configured', { status: 500 });
  const next = safeNext(req.nextUrl.searchParams.get('next'));
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
  url.searchParams.set('redirect_uri', new URL('/api/auth/github/callback', req.nextUrl.origin).toString());
  url.searchParams.set('scope', 'read:user');
  url.searchParams.set('state', state);
  url.searchParams.set('allow_signup', 'false');
  return NextResponse.redirect(url);
}

/** 오픈 리다이렉트 방지: 같은 사이트의 /ko/admin, /en/admin 경로만 허용 */
function safeNext(value: string | null): string {
  return value && /^\/(ko|en)\/admin(\/[\w\-/?=&.%]*)?$/.test(value) ? value : '/ko/admin';
}
