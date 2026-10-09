import { describe, expect, it } from 'vitest';
import { adminCollabSchema, collabDetailSchema, collabListResponseSchema, type CollabInput } from '@/schema';
import * as A from './adapt';

const card: A.BeCard = {
  id: 'c1',
  slug: 'granblue-fantasy-shaman-king-2027-01',
  title: 'Granblue Fantasy x SHAMAN KING',
  phase: 'upcoming',
  period: { start: '2027-01', end: null, precision: 'month', endKind: 'tba' },
  category: { key: 'category.in_game', label: 'In-game collab' },
  parties: [
    { id: 'p1', slug: 'granblue-fantasy', role: 'host', name: 'Granblue Fantasy', kind: { key: 'partner_category.game', label: 'Game' } },
    { id: 'p2', slug: 'shaman-king', role: 'partner', name: 'SHAMAN KING', kind: { key: 'partner_category.anime_manga', label: 'Anime / Manga' } },
  ],
  regions: [{ key: 'region.japan', label: 'Japan' }],
  platforms: [],
  collabTypes: [{ key: 'collab_type.story_event', label: 'Story / Event quest' }],
  cover: { url: 'https://media.example.com/c1.webp', originalUrl: null, credit: null, alt: null, width: null, height: null },
  publishedAt: '2026-10-01T00:00:00.000Z',
};

describe('Express 응답 변환', () => {
  it('목록: 월 단위 날짜를 YYYY-MM-01로, 이름을 value로 감싼다', () => {
    const list = collabListResponseSchema.parse(A.toListResponse([card], { total: 1, nextCursor: null }));
    expect(list.items[0]!.period.start).toBe('2027-01-01');
    expect(list.items[0]!.parties[1]!.name).toEqual({ value: 'SHAMAN KING', fallback: false, original: null });
    expect(list.items[0]!.cover!.alt).toBe(card.title);
  });

  it('상세: 출처 제목이 없으면 발행처·호스트명으로 채우고, 관련 콜라보 관계를 판정한다', () => {
    const detail = collabDetailSchema.parse(
      A.toDetail({
        ...card,
        summary: 'Summary',
        note: null,
        companies: [{ id: 'co1', slug: 'cygames', role: 'unspecified', name: 'Cygames' }],
        sources: [{ url: 'https://www.example.com/news', title: null, publisher: null, type: 'press', isPrimary: true, accessedAt: null, lastCheckedAt: null }],
        related: [{ ...card, slug: 'other', parties: [{ ...card.parties[0]! }] }],
        updatedAt: '2026-10-02T00:00:00.000Z',
      }),
    );
    expect(detail.sources[0]).toMatchObject({ title: 'example.com', publisher: 'example.com', accessedAt: '2026-10-02' });
    expect(detail.related[0]!.relation).toBe('same_host');
    expect(detail.companies[0]!.role).toBe('unspecified');
  });

  it('쿼리: 필터는 쉼표 목록, 월 범위는 그 달의 첫날과 마지막 날', () => {
    const sp = A.toListParams(
      { sort: 'recent', limit: 20, category: [], partner_category: [], region: ['region.korea', 'region.japan'], platform: [], collab_type: [], from: '2026-02', to: '2026-02' },
      'en',
    );
    expect(sp.get('region')).toBe('region.korea,region.japan');
    expect(sp.get('from')).toBe('2026-02-01');
    expect(sp.get('to')).toBe('2026-02-28');
    expect(sp.get('sort')).toBe('recent');
  });

  it('분류 트리를 평면 목록으로 펼친다', () => {
    const terms = A.flattenTaxonomy({
      platform: [
        {
          key: 'platform.mobile',
          label: 'Mobile',
          labels: { ko: '모바일', en: 'Mobile' },
          children: [{ key: 'platform.android', label: 'Android', labels: { ko: '안드로이드', en: 'Android' }, children: [] }],
        },
      ],
    });
    expect(terms.find((t) => t.key === 'platform.android')).toMatchObject({ parent: 'platform.mobile', ancestors: ['platform.mobile'], taxonomy: 'platform' });
  });
});

describe('관리자 변환', () => {
  const doc: A.BeAdminCollab = {
    id: 'd1',
    slug: 'draft',
    status: 'draft',
    rev: 3,
    i18n: { ko: { title: '제목', summary: '요약', note: null }, en: { title: 'Title', summary: 'Summary', note: null } },
    parties: [
      { propertyId: 'p1', role: 'host', name: { ko: '그랑블루 판타지', en: 'Granblue Fantasy' } },
      { propertyId: null, role: 'partner', name: { ko: '테스트 IP', en: 'Test IP' } },
    ],
    companies: [],
    category: null,
    regions: [],
    platforms: [],
    collabTypes: [],
    period: { start: '2026-11-01T00:00:00.000Z', end: null, precision: 'month', endKind: 'tba' },
    sources: [{ url: 'https://example.com/a', title: null, publisher: null, type: 'press', isPrimary: true, accessedAt: null, lastCheckedAt: null, httpStatus: 404 }],
    origin: { type: 'gpt', runId: 'r1', model: null, confidence: null, unmapped: { platform: ['Smart Fridge'], category: ['Other'], partner_category: ['Odd'] } },
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };

  it('편집기 문서: 미연결 참여자, 매핑 실패 값, 중복 후보를 옮긴다', () => {
    const c = adminCollabSchema.parse(
      A.toAdminCollab(doc, [{ id: 'x', slug: 'x', title: { ko: '기존', en: 'Old' }, reason: 'same_source_url' }]),
    );
    expect(c.parties[1]).toEqual({ propertyId: null, role: 'partner', name: { ko: '테스트 IP', en: 'Test IP' } });
    expect(c.unmapped).toEqual([
      { field: 'platforms', raw: 'Smart Fridge' },
      { field: 'category', raw: 'Other' },
    ]);
    expect(c.unmappedOther).toEqual([{ field: 'partner_category', raw: 'Odd' }]);
    expect(c.duplicates[0]).toMatchObject({ title: '기존', reason: 'same_source' });
    expect(c.sourceStatus[0]!.httpStatus).toBe(404);
    expect(c.period.start).toBe('2026-11-01');
  });

  it('저장 본문: 고르지 않은 역할의 미연결 참여자는 보존하고, 빈 메모는 null로', () => {
    const input: CollabInput = {
      slug: 'draft',
      i18n: { ko: { title: '제목', summary: '요약', note: '' }, en: { title: 'Title', summary: 'Summary', note: '' } },
      parties: [{ propertyId: 'p1', role: 'host' }],
      companies: [],
      category: null,
      regions: [],
      platforms: [],
      collabTypes: [],
      period: { start: '2026-11-01', end: null, precision: 'month', endKind: 'tba' },
      sources: [{ url: 'https://example.com/a', title: '', publisher: '', type: 'press', isPrimary: true, accessedAt: '2026-10-01' }],
    };
    const body = A.toCollabBody(input, doc.parties);
    expect(body.parties).toEqual([
      { propertyId: 'p1', role: 'host' },
      { role: 'partner', name: { ko: '테스트 IP', en: 'Test IP' } },
    ]);
    expect(body.i18n.ko.note).toBeNull();
    expect(body.period).toEqual({ start: '2026-11', end: null, precision: 'month', endKind: 'tba' });
    expect(body.sources[0]!.title).toBeNull();

    const linked = A.toCollabBody({ ...input, parties: [...input.parties, { propertyId: 'p2', role: 'partner' }] }, doc.parties);
    expect(linked.parties).toEqual([
      { propertyId: 'p1', role: 'host' },
      { propertyId: 'p2', role: 'partner' },
    ]);
  });

  it('대기열 건수: review는 초안 + 검수 요청', () => {
    const q = A.toQueue([{ ...doc, duplicateCount: 1 }], { draft: 2, in_review: 1, published: 113, archived: 0 });
    expect(q.counts.review).toBe(3);
    expect(q.items[0]).toMatchObject({ duplicateCandidate: true, origin: 'gpt', sourceCount: 1 });
  });
});
