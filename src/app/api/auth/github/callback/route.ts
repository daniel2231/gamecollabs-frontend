import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { oauthCallbackUrl } from '@/lib/site';
import { allowedLogins, SESSION_COOKIE, sessionCookieOptions, signSession } from '@/lib/auth/session';

const STATE_COOKIE = 'ct_oauth_state';

export async function GET(req: NextRequest) {
  const jar = await cookies();
  const saved = jar.get(STATE_COOKIE)?.value;
  jar.delete({ name: STATE_COOKIE, path: '/api/auth' });
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  let expected: { state: string; next: string } | null = null;
  try {
    expected = saved ? JSON.parse(saved) : null;
  } catch {
    expected = null;
  }
  if (!code || !state || !expected || expected.state !== state) return deny('invalid_state');

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: oauthCallbackUrl(),
    }),
    cache: 'no-store',
  });
  const { access_token: accessToken } = (await tokenRes.json().catch(() => ({}))) as { access_token?: string };
  if (!accessToken) return deny('token_exchange_failed');

  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' },
    cache: 'no-store',
  });
  const user = (await userRes.json().catch(() => null)) as { login?: string; name?: string | null; avatar_url?: string } | null;
  if (!user?.login || !allowedLogins().includes(user.login.toLowerCase())) return deny('not_allowed');

  const jwt = await signSession({ login: user.login, name: user.name ?? null, avatarUrl: user.avatar_url ?? null });
  jar.set(SESSION_COOKIE, jwt, sessionCookieOptions);
  return NextResponse.redirect(new URL(expected.next, req.nextUrl.origin));

  function deny(reason: string) {
    return NextResponse.redirect(new URL(`/ko/admin/login?error=${reason}`, req.nextUrl.origin));
  }
}
