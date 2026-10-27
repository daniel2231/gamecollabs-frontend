import { describe, expect, it } from 'vitest';
import type { CollabDetail, CompanyDetail, PropertyDetail } from '@/schema';
import { breadcrumbJsonLd, collabJsonLd, companyJsonLd, propertyJsonLd, serializeJsonLd, statsDatasetJsonLd } from './jsonld';

const name = (value: string, original: string | null = null) => ({ value, fallback: false, original });

const collab = (over: Partial<CollabDetail> = {}): CollabDetail => ({
  slug: 'a-x-b',
  title: 'A × B',
  fallback: false,
  phase: 'ongoing',
  period: { start: '2026-10-01', end: '2026-10-31', precision: 'day', endKind: 'fixed' },
  parties: [
    { slug: 'a', role: 'host', kind: { key: 'partner_category.game', label: '게임' }, name: name('A') },
    { slug: 'b', role: 'partner', kind: { key: 'partner_category.anime_manga', label: '애니' }, name: name('B') },
  ],
  category: { key: 'category.in_game', label: '게임 내' },
  regions: [],
  platforms: [],
  collabTypes: [],
  cover: null,
  publishedAt: '2026-09-20T00:00:00.000Z',
  summary: '요약',
  summaryFallback: false,
  note: null,
  companies: [
    { slug: 'pub', role: 'publisher', name: name('Pub') },
    { slug: 'lic', role: 'licensor', name: name('Lic') },
  ],
  sources: [{ url: 'https://official.test/news', title: 't', publisher: 'p', type: 'official', isPrimary: true, accessedAt: '2026-09-20' }],
  venues: [],
  related: [],
  updatedAt: '2026-10-02T00:00:00.000Z',
  ...over,
});

const ctx = { url: 'https://x.test/ko/collabs/a-x-b', locale: 'ko' };

describe('collabJsonLd', () => {
  it('일 단위 시작일이 있는 게임 내 콜라보는 온라인 Event', () => {
    expect(collabJsonLd(collab(), ctx)).toMatchObject({
      '@type': 'Event',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      location: { '@type': 'VirtualLocation', url: 'https://official.test/news' },
      organizer: [{ '@type': 'Organization', name: 'Pub' }],
    });
  });

  it('라이선서만 있으면 organizer를 넣지 않고, 공식 출처가 없으면 페이지 주소를 장소로 쓴다', () => {
    const ld = collabJsonLd(collab({ companies: [{ slug: 'lic', role: 'licensor', name: name('Lic') }], sources: [] }), ctx);
    expect(ld).not.toHaveProperty('organizer');
    expect(ld.location).toEqual({ '@type': 'VirtualLocation', url: ctx.url });
  });

  it('종료일이 정해지지 않았으면 endDate가 없다', () => {
    expect(collabJsonLd(collab({ period: { start: '2026-10-01', end: null, precision: 'day', endKind: 'permanent' } }), ctx)).not.toHaveProperty('endDate');
  });

  it('주소가 있는 장소가 있으면 오프라인 Event, 장소를 운영하는 브랜드 파트너도 주최자', () => {
    const ld = collabJsonLd(
      collab({
        category: { key: 'category.brand_campaign', label: '브랜드 캠페인' },
        companies: [
          { slug: 'pub', role: 'publisher', name: name('Pub') },
          { slug: 'shop', role: 'brand_partner', name: name('Shop') },
          { slug: 'lic', role: 'licensor', name: name('Lic') },
        ],
        venues: [
          { name: '시부야점', address: '東京都渋谷区1-1', url: 'https://shop.test/shibuya' },
          { name: '참여 매장 44곳', address: null, url: null },
        ],
      }),
      ctx,
    );
    expect(ld).toMatchObject({
      '@type': 'Event',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: { '@type': 'Place', name: '시부야점', address: { '@type': 'PostalAddress', streetAddress: '東京都渋谷区1-1' }, url: 'https://shop.test/shibuya' },
      organizer: [
        { '@type': 'Organization', name: 'Pub' },
        { '@type': 'Organization', name: 'Shop' },
      ],
    });
  });

  it('게임 내 콜라보에 주소 있는 장소가 더해지면 혼합 Event, 장소는 목록', () => {
    const ld = collabJsonLd(collab({ venues: [{ name: '팝업', address: '서울 성동구 1', url: null }] }), ctx);
    expect(ld.eventAttendanceMode).toBe('https://schema.org/MixedEventAttendanceMode');
    expect(ld.location).toEqual([
      { '@type': 'VirtualLocation', url: 'https://official.test/news' },
      { '@type': 'Place', name: '팝업', address: { '@type': 'PostalAddress', streetAddress: '서울 성동구 1' } },
    ]);
  });

  it('주소 없는 장소만 있으면 Article에 contentLocation으로 넣는다', () => {
    const ld = collabJsonLd(
      collab({ category: { key: 'category.brand_campaign', label: '브랜드 캠페인' }, venues: [{ name: '참여 매장 44곳', address: null, url: 'https://shop.test' }] }),
      ctx,
    );
    expect(ld['@type']).toBe('Article');
    expect(ld.contentLocation).toEqual([{ '@type': 'Place', name: '참여 매장 44곳', url: 'https://shop.test' }]);
  });

  it('오프라인이거나 시작일이 월 단위면 Article', () => {
    const offline = collabJsonLd(collab({ category: { key: 'category.offline', label: '오프라인' } }), ctx);
    expect(offline).toMatchObject({ '@type': 'Article', headline: 'A × B', datePublished: '2026-09-20T00:00:00.000Z', dateModified: '2026-10-02T00:00:00.000Z' });
    expect(offline.about).toEqual([
      { '@type': 'VideoGame', name: 'A' },
      { '@type': 'CreativeWork', name: 'B' },
    ]);
    expect(collabJsonLd(collab({ period: { start: '2026-10-01', end: null, precision: 'month', endKind: 'tba' } }), ctx)['@type']).toBe('Article');
  });
});

describe('propertyJsonLd / companyJsonLd', () => {
  it('작품 분류에 맞는 타입과 겹치지 않는 다른 이름을 넣는다', () => {
    const p = { slug: 'a', kind: { key: 'partner_category.game', label: '게임' }, name: name('태고의 달인', '太鼓の達人'), nameKo: '태고의 달인', nameEn: 'Taiko no Tatsujin', aliases: ['태고'], officialUrl: 'https://taiko.test' } as PropertyDetail;
    expect(propertyJsonLd(p, { url: 'u' })).toEqual({
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: '태고의 달인',
      url: 'u',
      alternateName: ['太鼓の達人', 'Taiko no Tatsujin', '태고'],
      sameAs: ['https://taiko.test'],
    });
  });

  it('회사는 Organization, 국가가 있으면 addressCountry', () => {
    const c = { slug: 'c', name: name('Calbee'), nameKo: '가루비', nameEn: 'Calbee', aliases: [], country: 'JP' } as unknown as CompanyDetail;
    expect(companyJsonLd(c, { url: 'u' })).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Calbee',
      url: 'u',
      alternateName: ['가루비'],
      address: { '@type': 'PostalAddress', addressCountry: 'JP' },
    });
  });
});

describe('breadcrumbJsonLd / serializeJsonLd', () => {
  it('마지막 항목은 item 없이 위치를 매긴다', () => {
    expect(breadcrumbJsonLd([{ name: '콜라보', url: 'https://x.test/ko' }, { name: 'A × B' }]).itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: '콜라보', item: 'https://x.test/ko' },
      { '@type': 'ListItem', position: 2, name: 'A × B' },
    ]);
  });

  it('script 태그를 닫을 수 없게 <를 이스케이프한다', () => {
    expect(serializeJsonLd({ name: '</script><b>' })).toBe('{"name":"\\u003c/script>\\u003cb>"}');
  });
});

describe('statsDatasetJsonLd', () => {
  const base = { name: 'Game × IP collab data', description: 'd', url: 'https://x.test/en/stats', locale: 'en', publisher: { name: 'GameCollabs', url: 'https://x.test' }, measured: ['Number of collabs'] };

  it('covers the first to the last year', () => {
    expect(statsDatasetJsonLd({ ...base, years: [2026, 2024, 2025] })).toMatchObject({
      '@type': 'Dataset',
      temporalCoverage: '2024/2026',
      creator: { '@type': 'Organization', name: 'GameCollabs' },
      variableMeasured: ['Number of collabs'],
    });
    expect(statsDatasetJsonLd({ ...base, years: [2025] }).temporalCoverage).toBe('2025');
    expect(statsDatasetJsonLd({ ...base, years: [] })).not.toHaveProperty('temporalCoverage');
  });
});
