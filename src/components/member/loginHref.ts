/** 지금 보고 있는 주소로 돌아오는 Discord 로그인 시작 주소 */
export function loginHref(): string {
  const here = typeof window === 'undefined' ? '' : window.location.pathname + window.location.search;
  return `/api/auth/discord/login${here ? `?next=${encodeURIComponent(here)}` : ''}`;
}
