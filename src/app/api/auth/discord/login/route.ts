import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { api } from '@/lib/api';
import { DISCORD_STATE_COOKIE, discordAvatarUrl, displayName, MEMBER_COOKIE, memberCookieOptions, memberDevLoginEnabled, safeMemberNext, signMemberSession } from '@/lib/auth/member';
import { discordCallbackUrl, siteUrl } from '@/lib/site';

/**
 * Discord OAuth2(Authorization Code + PKCE) 시작. state와 code_verifier는 10분짜리 쿠키에 두고
 * 콜백에서 확인한다. 범위는 identify뿐(이메일은 받지 않는다).
 */
export async function GET(req: NextRequest) {
  const next = safeMemberNext(req.nextUrl.searchParams.get('next'));

  if (memberDevLoginEnabled()) {
    const profile = { discordId: '100000000000000001', username: 'dev-member', globalName: '개발 회원', avatar: null };
    const member = await api.upsertDiscordMember(profile);
    const jwt = await signMemberSession({ id: member.id, name: displayName(profile), avatarUrl: discordAvatarUrl(profile) });
    (await cookies()).set(MEMBER_COOKIE, jwt, memberCookieOptions);
    return NextResponse.redirect(new URL(next, req.nextUrl.origin));
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return new NextResponse('DISCORD_CLIENT_ID is not configured', { status: 500 });
  // GitHub 로그인과 같은 이유: 등록한 콜백 주소의 호스트에서 시작해야 state 쿠키가 콜백까지 따라온다. 한 번만 옮긴다
  const canonical = new URL(siteUrl());
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const restarted = req.nextUrl.searchParams.has('restarted');
  if (host && host !== canonical.host && !restarted && process.env.NODE_ENV === 'production') {
    const restart = new URL('/api/auth/discord/login', canonical);
    restart.searchParams.set('next', next);
    restart.searchParams.set('restarted', '1');
    return NextResponse.redirect(restart);
  }

  const state = randomBytes(16).toString('base64url');
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  (await cookies()).set(DISCORD_STATE_COOKIE, JSON.stringify({ state, verifier, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 600,
  });
  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', discordCallbackUrl());
  url.searchParams.set('scope', 'identify');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  // 이미 허락한 사용자는 동의 화면 없이 바로 돌아온다
  url.searchParams.set('prompt', 'none');
  return NextResponse.redirect(url);
}
