import type { Metadata } from 'next';
import { routing, type Locale } from '@/i18n/routing';

type OpenGraph = NonNullable<Metadata['openGraph']>;

const OG_LOCALE: Record<Locale, string> = { ko: 'ko_KR', en: 'en_US' };

/** 경로(`''`, `/collabs/slug` …)의 언어별 주소. x-default는 기본 언어(ko) 주소 */
export function languageAlternates(path: string, base = ''): Record<string, string> {
  return {
    ...Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}${path}`])),
    'x-default': `${base}/${routing.defaultLocale}${path}`,
  };
}

/**
 * canonical·hreflang·RSS 링크. 메타데이터는 얕게 병합되므로 alternates를 정하는 페이지는 이 값을 통째로 넘긴다.
 * 레이아웃에는 canonical을 두지 않는다(404·에러 페이지가 홈을 canonical로 물려받지 않도록).
 */
export function alternatesFor(locale: Locale, path: string): NonNullable<Metadata['alternates']> {
  return {
    canonical: `/${locale}${path}`,
    languages: languageAlternates(path),
    types: { 'application/rss+xml': `/${locale}/rss.xml` },
  };
}

/** 페이지마다 같은 siteName·locale·url을 넣는다. 페이지가 openGraph를 정하면 레이아웃 값이 통째로 사라지기 때문 */
export function openGraphFor({
  locale,
  path,
  siteName,
  ...rest
}: { locale: Locale; path: string; siteName: string } & OpenGraph): OpenGraph {
  return {
    type: 'website',
    siteName,
    locale: OG_LOCALE[locale],
    alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
    url: `/${locale}${path}`,
    ...rest,
  } as OpenGraph;
}

/**
 * `[locale]/opengraph-image`의 기본 OG 이미지. 파일 규칙 이미지는 그 세그먼트(레이아웃)의 openGraph에 붙으므로,
 * openGraph를 직접 정하면서 자체 이미지가 없는 페이지는 이 값을 images로 넘겨야 한다
 */
export function defaultOgImage(locale: Locale) {
  return { url: `/${locale}/opengraph-image`, width: 1200, height: 630, type: 'image/png' };
}

/** 검색엔진 소유 확인 메타 태그. 값이 없는 항목은 내보내지 않는다 */
export function verificationFromEnv(env: Record<string, string | undefined> = process.env): Metadata['verification'] {
  const other: Record<string, string> = {};
  if (env.NAVER_SITE_VERIFICATION) other['naver-site-verification'] = env.NAVER_SITE_VERIFICATION;
  if (env.BING_SITE_VERIFICATION) other['msvalidate.01'] = env.BING_SITE_VERIFICATION;
  const google = env.GOOGLE_SITE_VERIFICATION || undefined;
  if (!google && Object.keys(other).length === 0) return undefined;
  return { ...(google ? { google } : {}), ...(Object.keys(other).length ? { other } : {}) };
}
