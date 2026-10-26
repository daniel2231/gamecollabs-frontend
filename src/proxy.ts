import { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { detectLocale } from './i18n/detect';
import { isLocale, routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

/** next-intl 기본 쿠키 이름(routing에서 바꾸지 않았다) */
const LOCALE_COOKIE = 'NEXT_LOCALE';

export default function proxy(request: NextRequest) {
  const hasPrefix = isLocale(request.nextUrl.pathname.split('/')[1] ?? '');
  if (hasPrefix || request.cookies.has(LOCALE_COOKIE)) return handleI18nRouting(request);

  // 접두사·쿠키가 없는 첫 방문: 접속 국가(Vercel이 붙이는 헤더)까지 보고 고른 언어를
  // Accept-Language로 넘겨, 리다이렉트·쿠키 처리는 next-intl이 그대로 하게 한다
  const locale = detectLocale(request.headers.get('accept-language'), request.headers.get('x-vercel-ip-country'));
  if (!locale) return handleI18nRouting(request);
  const headers = new Headers(request.headers);
  headers.set('accept-language', locale);
  return handleI18nRouting(new NextRequest(request, { headers }));
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
