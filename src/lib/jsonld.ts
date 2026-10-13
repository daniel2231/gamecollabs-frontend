/**
 * schema.org 구조화 데이터. 화면에 보이는 정보만 넣는다(구글 구조화 데이터 지침).
 * 모든 URL은 절대 주소여야 하므로 base(siteUrl)를 받는다.
 */
import type { CollabDetail, CompanyDetail, PropertyDetail, Venue } from '@/schema';

type Thing = Record<string, unknown>;

const CONTEXT = 'https://schema.org';

/** 행사를 운영하는 쪽. 라이선서는 주최자가 아니다 */
const ORGANIZER_ROLES = new Set(['publisher', 'organizer']);
/** 오프라인 행사는 매장·장소를 운영하는 브랜드 파트너도 주최자다 */
const OFFLINE_ORGANIZER_ROLES = new Set([...ORGANIZER_ROLES, 'brand_partner']);

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

const place = (v: Venue): Thing => ({
  '@type': 'Place',
  name: v.name,
  ...(v.address ? { address: { '@type': 'PostalAddress', streetAddress: v.address } } : {}),
  ...(v.url ? { url: v.url } : {}),
});

/**
 * 시작일이 일 단위로 확인됐을 때만 Event로 표시한다. 장소는
 * - 게임 내 콜라보: 온라인(VirtualLocation)
 * - 주소가 있는 장소: 오프라인(Place). 구글 Event는 location.address가 필수라 주소 없는 장소는 넣지 않는다
 * 둘 다 있으면 혼합, 둘 다 없거나 날짜가 불확실하면 Article로 두고 장소는 contentLocation에 넣는다.
 */
export function collabJsonLd(collab: CollabDetail, { url, locale }: { url: string; locale: string }): Thing {
  const image = collab.cover?.url ? [collab.cover.url] : undefined;
  const description = collab.summary || undefined;
  const dated = collab.period.precision === 'day' && Boolean(collab.period.start);
  const online = collab.category?.key === 'category.in_game';
  const addressed = collab.venues.filter((v) => v.address);

  if (dated && (online || addressed.length > 0)) {
    const roles = addressed.length > 0 ? OFFLINE_ORGANIZER_ROLES : ORGANIZER_ROLES;
    const organizers = collab.companies.filter((c) => roles.has(c.role));
    const primarySource = collab.sources.find((s) => s.isPrimary && s.type === 'official') ?? collab.sources.find((s) => s.type === 'official');
    const locations = [...(online ? [{ '@type': 'VirtualLocation', url: primarySource?.url ?? url }] : []), ...addressed.map(place)];
    const mode = online && addressed.length > 0 ? 'Mixed' : online ? 'Online' : 'Offline';
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
      eventAttendanceMode: `https://schema.org/${mode}EventAttendanceMode`,
      location: locations.length === 1 ? locations[0] : locations,
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
    ...(collab.venues.length ? { contentLocation: collab.venues.map(place) } : {}),
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
