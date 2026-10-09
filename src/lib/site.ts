export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

/** GitHub OAuth 앱의 Authorization callback URL에 그대로 등록해야 하는 주소 */
export function oauthCallbackUrl(): string {
  return `${siteUrl()}/api/auth/github/callback`;
}
