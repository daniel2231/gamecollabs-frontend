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

/**
 * 검색엔진 소유 확인 코드. 페이지 HTML에 그대로 드러나는 공개 값이라 코드에 둔다.
 * 구글은 Search Console 도메인 속성(DNS TXT)으로 확인하므로 태그가 필요 없다.
 */
const SITE_VERIFICATION = {
  naver: '2b4e141d453ae14f742454abbd865feb25672b8d',
  bing: '442FC2131C37B6876E5B9C499116854B',
};

/** 검색엔진 소유 확인 메타 태그. 환경 변수가 있으면 그 값을 쓴다(다른 도메인에 배포할 때) */
export function siteVerification(env: Record<string, string | undefined> = process.env): Metadata['verification'] {
  const google = env.GOOGLE_SITE_VERIFICATION || undefined;
  const naver = env.NAVER_SITE_VERIFICATION || SITE_VERIFICATION.naver;
  const bing = env.BING_SITE_VERIFICATION || SITE_VERIFICATION.bing;
  return { ...(google ? { google } : {}), other: { 'naver-site-verification': naver, 'msvalidate.01': bing } };
}

/** 검색 결과 설명(약 160자). 넘치면 단어 중간이 아니라 공백에서 자르고 …를 붙인다 */
export function clampDescription(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  // 띄어쓰기가 드문 문장이면 너무 짧아지지 않도록 그냥 자른다
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:·—–-]+$/, '')}…`;
}

/** 제목에 이미 콜라보라는 말이 있으면 다시 붙이지 않는다 */
const COLLAB_WORD = /collab|콜라보|컬래버|콜라보레이션/i;

/**
 * '[게임] × [IP] 콜라보' 검색에 맞춘 콜라보 상세 제목: 제목 + 콜라보 표기 + 시작 연도.
 * 같은 두 작품이 여러 번 콜라보하므로 연도로 구별한다. format은 언어별 메시지({title}, {year})
 */
export function collabSearchTitle(
  title: string,
  start: string | null,
  format: { plain: (title: string) => string; withYear: (title: string, year: string) => string },
): string {
  const year = start?.slice(0, 4) ?? null;
  if (COLLAB_WORD.test(title)) return year ? `${title} (${year})` : title;
  return year ? format.withYear(title, year) : format.plain(title);
}
