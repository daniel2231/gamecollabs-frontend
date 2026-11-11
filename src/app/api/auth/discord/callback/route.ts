import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { api, ApiError } from '@/lib/api';
import { DISCORD_STATE_COOKIE, discordAvatarUrl, displayName, MEMBER_COOKIE, memberCookieOptions, memberLoginPath, safeMemberNext, signMemberSession } from '@/lib/auth/member';
import { discordCallbackUrl } from '@/lib/site';

const DISCORD_API = 'https://discord.com/api/v10';

const savedSchema = z.object({ state: z.string(), verifier: z.string(), next: z.string() });
const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  global_name: z.string().nullish(),
  avatar: z.string().nullish(),
});

export async function GET(req: NextRequest) {
  const jar = await cookies();
  const raw = jar.get(DISCORD_STATE_COOKIE)?.value;
  jar.delete({ name: DISCORD_STATE_COOKIE, path: '/api/auth' });
  let saved: z.infer<typeof savedSchema> | null = null;
  try {
    saved = raw ? savedSchema.parse(JSON.parse(raw)) : null;
  } catch {
    saved = null;
  }
  const next = safeMemberNext(saved?.next);
  const deny = (reason: string) => NextResponse.redirect(new URL(memberLoginPath(next, reason), req.nextUrl.origin));

  const params = req.nextUrl.searchParams;
  // 사용자가 동의 화면에서 취소했거나 prompt=none인데 아직 허락하지 않은 경우
  if (params.get('error')) return deny(params.get('error') === 'access_denied' ? 'cancelled' : 'discord_error');
  const code = params.get('code');
  if (!code || !saved || saved.state !== params.get('state')) return deny('invalid_state');

  const clientId = process.env.DISCORD_CLIENT_ID ?? '';
  const clientSecret = process.env.DISCORD_CLIENT_SECRET ?? '';
  // Discord 토큰 엔드포인트는 JSON이 아니라 form-urlencoded 본문만 받는다
  const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: discordCallbackUrl(),
      code_verifier: saved.verifier,
    }),
    cache: 'no-store',
  }).catch(() => null);
  const { access_token: accessToken } = ((await tokenRes?.json().catch(() => ({}))) ?? {}) as { access_token?: string };
  if (!accessToken) return deny('token_exchange_failed');

  const userRes = await fetch(`${DISCORD_API}/users/@me`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }).catch(() => null);
  // 프로필만 한 번 읽으면 되므로 Discord 토큰은 보관하지 않고 바로 폐기한다
  void fetch(`${DISCORD_API}/oauth2/token/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, token: accessToken, token_type_hint: 'access_token' }),
    cache: 'no-store',
  }).catch(() => undefined);
  const user = userSchema.safeParse(await userRes?.json().catch(() => null));
  if (!userRes?.ok || !user.success) return deny('profile_failed');

  const profile = { discordId: user.data.id, username: user.data.username, globalName: user.data.global_name ?? null, avatar: user.data.avatar ?? null };
  let memberId: string;
  try {
    memberId = (await api.upsertDiscordMember(profile)).id;
  } catch (e) {
    if (e instanceof ApiError && e.code === 'member_disabled') return deny('disabled');
    console.error('member upsert failed', e);
    return deny('server_error');
  }
  const jwt = await signMemberSession({ id: memberId, name: displayName(profile), avatarUrl: discordAvatarUrl(profile) });
  jar.set(MEMBER_COOKIE, jwt, memberCookieOptions);
  return NextResponse.redirect(new URL(next, req.nextUrl.origin));
}
