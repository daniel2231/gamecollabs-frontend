import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { DiscordProfile } from '@/lib/api';

/**
 * 회원 세션: Discord 로그인 후 발급하는 JWT(HS256)를 httpOnly 쿠키에 둔다.
 * 관리자 세션(session.ts)과 비밀값·발급자는 같지만 audience와 scope가 달라 서로 대신 쓸 수 없다.
 * Express는 같은 비밀값과 MEMBER_JWT_AUDIENCE로 검증하고, members에서 활성 회원인지 매번 확인한다.
 * 헤더의 이름·아바타는 토큰에 담아 두어 백엔드를 부르지 않고 그린다(다음 로그인 때 갱신).
 */

export const MEMBER_COOKIE = 'ct_member';
/** Discord 로그인 중에만 쓰는 state·PKCE 쿠키(경로 /api/auth, 10분) */
export const DISCORD_STATE_COOKIE = 'ct_discord_state';
const TTL_SECONDS = 60 * 60 * 24 * 30;
/** Express의 ADMIN_JWT_ISSUER / MEMBER_JWT_AUDIENCE 기본값과 같아야 한다 */
const ISSUER = 'gamecollabs-web';
const AUDIENCE = 'gamecollabs-api-member';

export type MemberSession = { id: string; name: string; avatarUrl: string; token: string };

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error('AUTH_SECRET must be set (32+ chars)');
  return new TextEncoder().encode(value);
}

/** global_name(표시 이름)이 있으면 그것, 없으면 username. Discord는 이제 #1234 태그를 쓰지 않는다 */
export function displayName(p: Pick<DiscordProfile, 'username' | 'globalName'>): string {
  return p.globalName?.trim() || p.username;
}

/** 아바타가 없으면 Discord 기본 아바타(새 사용자명 체계: (id >> 22) % 6) */
export function discordAvatarUrl(p: Pick<DiscordProfile, 'discordId' | 'avatar'>, size = 64): string {
  if (p.avatar) return `https://cdn.discordapp.com/avatars/${p.discordId}/${p.avatar}.png?size=${size}`;
  const index = Number((BigInt(p.discordId) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export async function signMemberSession(member: { id: string; name: string; avatarUrl: string }): Promise<string> {
  return new SignJWT({ scope: 'member', name: member.name, avatar: member.avatarUrl })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(member.id)
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifyMemberSession(token: string): Promise<MemberSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, audience: AUDIENCE, algorithms: ['HS256'] });
    if (!payload.sub || payload.scope !== 'member') return null;
    return {
      id: payload.sub,
      name: typeof payload.name === 'string' ? payload.name : '',
      avatarUrl: typeof payload.avatar === 'string' ? payload.avatar : '',
      token,
    };
  } catch {
    return null;
  }
}

/** 쿠키를 읽으므로 이 함수를 부르는 페이지는 동적으로 렌더링된다. 공개 페이지에서는 /api/me를 브라우저에서 부른다 */
export async function getMemberSession(): Promise<MemberSession | null> {
  const token = (await cookies()).get(MEMBER_COOKIE)?.value;
  return token ? verifyMemberSession(token) : null;
}

export const memberCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: TTL_SECONDS,
};

/** 개발 전용: Discord 앱 없이 가짜 회원으로 로그인(production에서는 무시) */
export function memberDevLoginEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.MEMBER_DEV_LOGIN === '1';
}

/**
 * 로그인 뒤 돌아갈 주소. 오픈 리다이렉트를 막으려고 같은 사이트의 /ko·/en 경로만 받는다
 * (`//evil.com`, `/\\evil.com` 같은 주소는 첫 글자 뒤가 로케일이 아니라서 걸러진다)
 */
export function safeMemberNext(value: string | null | undefined, fallbackLocale = 'ko'): string {
  return value && /^\/(ko|en)(\/[\w\-/?=&.%~]*)?$/.test(value) ? value : `/${fallbackLocale}`;
}

/** 로그인 화면 주소(오류 코드와 돌아갈 곳을 붙인다) */
export function memberLoginPath(next: string, error?: string): string {
  const locale = next.split('/')[1] === 'en' ? 'en' : 'ko';
  const sp = new URLSearchParams({ next });
  if (error) sp.set('error', error);
  return `/${locale}/login?${sp}`;
}
