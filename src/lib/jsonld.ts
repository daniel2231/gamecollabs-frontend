/**
 * schema.org 구조화 데이터. 화면에 보이는 정보만 넣는다(구글 구조화 데이터 지침).
 * 모든 URL은 절대 주소여야 하므로 base(siteUrl)를 받는다.
 */
import type { CollabDetail, CompanyDetail, PropertyDetail } from '@/schema';

type Thing = Record<string, unknown>;

const CONTEXT = 'https://schema.org';

/** 행사를 운영하는 쪽. 라이선서·브랜드 파트너는 주최자가 아니다 */
const ORGANIZER_ROLES = new Set(['publisher', 'organizer']);

/** 작품 분류 키 → schema.org 타입 */
function propertyType(kindKey: string): string {
  if (kindKey === 'partner_category.game') return 'VideoGame';
  if (kindKey === 'partner_category.brand') return 'Brand';
  return 'CreativeWork';
}

/** 이름과 겹치지 않는 다른 표기(원어, 다른 언어 이름, 별칭) */
function alternateNames(name: string, others: (string | null | undefined)[]): string[] | undefined {
  const list = [...new Set(others.filter((n): n is string => Boolean(n) && n !== name))];
  return list.length ? list : undefined;
}

/** `<script type="application/ld+json">` 안에 넣을 문자열. `</script>`로 끝나지 않도록 `<`를 이스케이프한다 */
export function serializeJsonLd(data: Thing | Thing[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function breadcrumbJsonLd(items: { name: string; url?: string }[]): Thing {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

/**
 * 시작일이 일 단위로 확인된 게임 내 콜라보만 Event(온라인)로 표시한다.
 * 오프라인 행사는 주소가, 날짜가 불확실한 콜라보는 시작일이 없어 Event 필수 항목을 채울 수 없으므로 Article로 둔다.
 */
export function collabJsonLd(collab: CollabDetail, { url, locale }: { url: string; locale: string }): Thing {
  const image = collab.cover?.url ? [collab.cover.url] : undefined;
  const description = collab.summary || undefined;
  const isEvent = collab.category?.key === 'category.in_game' && collab.period.precision === 'day' && Boolean(collab.period.start);

  if (isEvent) {
    const organizers = collab.companies.filter((c) => ORGANIZER_ROLES.has(c.role));
    const primarySource = collab.sources.find((s) => s.isPrimary && s.type === 'official') ?? collab.sources.find((s) => s.type === 'official');
    return {
      '@context': CONTEXT,
      '@type': 'Event',
      name: collab.title,
      url,
      inLanguage: locale,
      ...(description ? { description } : {}),
      ...(image ? { image } : {}),
      startDate: collab.period.start,
      ...(collab.period.endKind === 'fixed' && collab.period.end ? { endDate: collab.period.end } : {}),
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      location: { '@type': 'VirtualLocation', url: primarySource?.url ?? url },
      ...(organizers.length ? { organizer: organizers.map((c) => ({ '@type': 'Organization', name: c.name.value })) } : {}),
    };
  }

  return {
    '@context': CONTEXT,
    '@type': 'Article',
    headline: collab.title,
    url,
    inLanguage: locale,
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    ...(collab.publishedAt ? { datePublished: collab.publishedAt } : {}),
    dateModified: collab.updatedAt,
    about: collab.parties.map((p) => ({ '@type': propertyType(p.kind.key), name: p.name.value })),
  };
}

export function propertyJsonLd(p: PropertyDetail, { url }: { url: string }): Thing {
  const alternateName = alternateNames(p.name.value, [p.name.original, p.nameKo, p.nameEn, ...p.aliases]);
  return {
    '@context': CONTEXT,
    '@type': propertyType(p.kind.key),
    name: p.name.value,
    url,
    ...(alternateName ? { alternateName } : {}),
    ...(p.officialUrl ? { sameAs: [p.officialUrl] } : {}),
  };
}

export function companyJsonLd(c: CompanyDetail, { url }: { url: string }): Thing {
  const alternateName = alternateNames(c.name.value, [c.name.original, c.nameKo, c.nameEn, ...c.aliases]);
  return {
    '@context': CONTEXT,
    '@type': 'Organization',
    name: c.name.value,
    url,
    ...(alternateName ? { alternateName } : {}),
    ...(c.country ? { address: { '@type': 'PostalAddress', addressCountry: c.country } } : {}),
  };
}

export function websiteJsonLd({ name, description, url, locale }: { name: string; description: string; url: string; locale: string }): Thing {
  return { '@context': CONTEXT, '@type': 'WebSite', name, description, url, inLanguage: locale };
}
