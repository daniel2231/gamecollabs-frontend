import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

/**
 * 관리자 세션: GitHub 로그인 후 발급하는 단기 JWT(HS256)를 httpOnly 쿠키에 둔다.
 * 같은 토큰을 Express /v1/admin/* 호출 시 Bearer로 전달한다. Express는 이 값과 같은
 * ADMIN_JWT_SECRET으로 검증하고, iss/aud와 users 컬렉션의 GitHub 계정을 확인한다.
 * 서버에 세션 상태를 두지 않는다.
 */

export const SESSION_COOKIE = 'ct_admin';
const TTL_SECONDS = 60 * 60 * 8;
/** Express의 ADMIN_JWT_ISSUER / ADMIN_JWT_AUDIENCE 기본값과 같아야 한다 */
const ISSUER = 'gamecollabs-web';
const AUDIENCE = 'gamecollabs-api';

export type AdminSession = { login: string; name: string | null; avatarUrl: string | null; token: string };

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error('AUTH_SECRET must be set (32+ chars)');
  return new TextEncoder().encode(value);
}

export function devBypassEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ADMIN_DEV_BYPASS === '1';
}

export function allowedLogins(): string[] {
  return (process.env.ADMIN_GITHUB_LOGINS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function signSession(user: { login: string; name: string | null; avatarUrl: string | null }): Promise<string> {
  return new SignJWT({ name: user.name, avatar: user.avatarUrl, scope: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.login)
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (!payload.sub || payload.scope !== 'admin') return null;
    // 허용 목록에서 빠진 계정은 토큰이 남아 있어도 거부
    if (!allowedLogins().includes(payload.sub.toLowerCase())) return null;
    return {
      login: payload.sub,
      name: typeof payload.name === 'string' ? payload.name : null,
      avatarUrl: typeof payload.avatar === 'string' ? payload.avatar : null,
      token,
    };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  if (devBypassEnabled()) return { login: 'dev', name: '개발 모드', avatarUrl: null, token: 'dev-bypass' };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: TTL_SECONDS,
};
