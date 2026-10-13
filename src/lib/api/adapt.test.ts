import { describe, expect, it } from 'vitest';
import { adminCollabSchema, collabDetailSchema, collabListResponseSchema, followUpItemSchema, type CollabInput } from '@/schema';
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

  it('커버: 응답에 없으면 undefined(모름), 있으면 주소를 MEDIA_BASE_URL로 만든다', () => {
    expect(A.toAdminCollab(doc, []).cover).toBeUndefined();
    expect(A.toAdminCollab({ ...doc, cover: null }, []).cover).toBeNull();
    const cover = A.toAdminCollab(
      { ...doc, cover: { storageKey: 'covers/ab.webp', originalUrl: null, credit: null, alt: null, width: 1600, height: 900 } },
      [],
      'https://media.example.com/',
    ).cover;
    expect(cover).toMatchObject({ url: 'https://media.example.com/covers/ab.webp', credit: '', alt: { ko: '', en: '' } });
    expect(adminCollabSchema.safeParse({ ...A.toAdminCollab(doc, []), cover }).success).toBe(true);
    // 백엔드 collabAdmin 형태 그대로(미러링 오류 필드 포함, 원본 링크만 있는 커버)
    const linkOnly = A.toAdminCollab(
      {
        ...doc,
        cover: { storageKey: null, url: 'https://x.test/a.jpg', originalUrl: 'https://x.test/a.jpg', credit: null, alt: null, width: null, height: null, mirrorError: 'timeout' } as A.BeAdminCover,
      },
      [],
    ).cover;
    expect(linkOnly).toMatchObject({ storageKey: null, url: 'https://x.test/a.jpg', originalUrl: 'https://x.test/a.jpg' });
  });

  it('커버 저장 본문: 건드리지 않으면 빼고, 대체 텍스트는 한·영이 모두 있어야 보낸다', () => {
    const input: CollabInput = {
      slug: 'a',
      i18n: { ko: { title: '제목', summary: '요약', note: '' }, en: { title: 'Title', summary: 'Summary', note: '' } },
      parties: [],
      companies: [],
      category: null,
      regions: [],
      platforms: [],
      collabTypes: [],
      period: { start: null, end: null, precision: 'unknown', endKind: 'tba' },
      sources: [],
    };
    expect('cover' in A.toCollabBody(input)).toBe(false);
    expect(A.toCollabBody({ ...input, cover: null }).cover).toBeNull();
    const cover = { storageKey: 'covers/ab.webp', url: 'x', originalUrl: null, credit: ' ', alt: { ko: '설명', en: '' }, width: 1600, height: 900 };
    expect(A.toCollabBody({ ...input, cover }).cover).toEqual({
      storageKey: 'covers/ab.webp',
      originalUrl: null,
      credit: null,
      alt: null,
      width: 1600,
      height: 900,
    });
    expect(A.toCollabBody({ ...input, cover: { ...cover, alt: { ko: '설명', en: 'Alt' } } }).cover?.alt).toEqual({ ko: '설명', en: 'Alt' });
  });

  it('커버 없음만: 백엔드에 cover=missing을 보내고, 백엔드가 무시해도 커버 있는 항목은 거른다', () => {
    expect(A.queueParams({ status: 'published', cover: 'missing' }).get('cover')).toBe('missing');
    expect(A.queueParams({ status: 'published', q: '진격 거인' }).toString()).toBe('status=published&limit=100&q=%EC%A7%84%EA%B2%A9+%EA%B1%B0%EC%9D%B8');
    const withCover = { ...doc, id: 'a', cover: { storageKey: 'covers/a.webp', originalUrl: null, credit: null, alt: null, width: 1, height: 1 } };
    const without = { ...doc, id: 'b', cover: null };
    const unknown = { ...doc, id: 'c' }; // 커버 필드를 주지 않는 백엔드
    const counts = { draft: 0, in_review: 0, published: 3, archived: 0 };
    expect(A.toQueue([withCover, without, unknown], counts).items.map((i) => [i.id, i.hasCover])).toEqual([
      ['a', true],
      ['b', false],
      ['c', null],
    ]);
    // 모르는 것은 숨기지 않는다
    expect(A.toQueue([withCover, without, unknown], counts, { status: 'published', cover: 'missing' }).items.map((i) => i.id)).toEqual(['b', 'c']);
  });

  it('대기열 페이지: 커서를 보내고 다음 커서를 넘긴다', () => {
    expect(A.queueParams({ status: 'published', cursor: 'abc' }).get('cursor')).toBe('abc');
    const counts = { draft: 0, in_review: 0, published: 150, archived: 0 };
    expect(A.toQueue([doc], counts, { status: 'published' }, 'next-1').nextCursor).toBe('next-1');
    expect(A.toQueue([doc], counts).nextCursor).toBeNull();
  });

  it('대기열 건수: review는 초안 + 검수 요청', () => {
    const q = A.toQueue([{ ...doc, duplicateCount: 1 }], { draft: 2, in_review: 1, published: 113, archived: 0 });
    expect(q.counts.review).toBe(3);
    expect(q.items[0]).toMatchObject({ duplicateCandidate: true, origin: 'gpt', sourceCount: 1 });
  });
});

describe('toSitemap', () => {
  it('작품·회사 updatedAt은 있을 때만 넘기고, 콜라보 updatedAt이 없으면 epoch로 둔다', () => {
    expect(
      A.toSitemap({
        collabs: [{ slug: 'c', updatedAt: null }],
        properties: [{ slug: 'p', updatedAt: '2026-10-01T00:00:00.000Z' }, { slug: 'q' }],
        companies: [{ slug: 'k', updatedAt: null }],
      }),
    ).toEqual({
      collabs: [{ slug: 'c', updatedAt: '1970-01-01T00:00:00.000Z' }],
      properties: [{ slug: 'p', updatedAt: '2026-10-01T00:00:00.000Z' }, { slug: 'q' }],
      companies: [{ slug: 'k' }],
    });
  });
});

describe('venues', () => {
  it('공개 상세: 이름 없는 장소는 버리고, 장소가 없으면 빈 배열', () => {
    const base = { ...card, summary: '', note: null, companies: [], sources: [], related: [], updatedAt: null } as A.BeDetail;
    expect(A.toDetail(base).venues).toEqual([]);
    expect(
      A.toDetail({ ...base, venues: [{ name: '시부야점', address: '東京都渋谷区', url: null }, { name: null, address: null, url: null }] }).venues,
    ).toEqual([{ name: '시부야점', address: '東京都渋谷区', url: null }]);
  });

  it('관리자 저장: venues를 정했을 때만 본문에 넣는다', () => {
    const input = {
      slug: 'a',
      i18n: { ko: { title: 't', summary: 's', note: '' }, en: { title: 't', summary: 's', note: '' } },
      parties: [],
      companies: [],
      category: null,
      regions: [],
      platforms: [],
      collabTypes: [],
      period: { start: null, end: null, precision: 'unknown', endKind: 'tba' },
      sources: [],
    } satisfies CollabInput;
    expect(A.toCollabBody(input)).not.toHaveProperty('venues');
    const venues = [{ name: { ko: '시부야점', en: 'Shibuya' }, address: null, url: 'https://shop.test' }];
    expect(A.toCollabBody({ ...input, venues }).venues).toEqual(venues);
    expect(A.toCollabBody({ ...input, venues: [] }).venues).toEqual([]);
  });
});

describe('후속 확인 변환', () => {
  const proposal: A.BeFollowUpProposal = {
    changes: { period: { start: '2026-11', endKind: 'tba' }, i18n: { ko: { title: '가 × 나', summary: '요약' }, en: { title: 'A x B', summary: 'Summary' } } },
    sources: [{ url: 'https://example.com/dates', title: null }],
    note: null,
    rev: 3,
    by: 'token:mcp',
    at: '2026-10-13T00:00:00.000Z',
  };

  it('큐 항목: 기간을 화면 형태로, 제안의 입력형 기간은 정밀도를 날짜 길이로 정한다', () => {
    const item = followUpItemSchema.parse(
      A.toFollowUpItem({
        id: 'c1',
        slug: 'a-b-2026-11',
        status: 'published',
        rev: 4,
        reason: 'month_only',
        title: { ko: '가 × 나', en: 'A x B' },
        summary: { ko: null, en: 'Old' },
        period: { start: '2026-11', end: null, precision: 'month', endKind: 'tba' },
        sourceUrls: ['https://example.com/a'],
        lastCheckedAt: null,
        nextCheckAt: '2026-10-16T00:00:00.000Z',
        uncheckedRuns: 2,
        escalated: false,
        proposal,
      }),
    );
    expect(item.period).toEqual({ start: '2026-11-01', end: null, precision: 'month', endKind: 'tba' });
    expect(item.text.ko).toEqual({ title: '가 × 나', summary: '' });
    expect(item.unchanged).toBe(2);
    expect(item.proposal!.period).toEqual({ start: '2026-11-01', end: null, precision: 'month', endKind: 'tba' });
    expect(item.proposal!.sources).toEqual([{ url: 'https://example.com/dates', title: null, publisher: null }]);
  });

  it('입력형 기간: 정밀도·종료 방식 기본값', () => {
    expect(A.fromPeriodInput({ start: '2026-11-05', end: '2026-12-01' })).toEqual({ start: '2026-11-05', end: '2026-12-01', precision: 'day', endKind: 'fixed' });
    expect(A.fromPeriodInput({ endKind: 'tba' })).toEqual({ start: null, end: null, precision: 'unknown', endKind: 'tba' });
  });

  it('상태: escalatedAt을 불리언으로, 기록이 없으면 0회', () => {
    expect(A.toFollowUpState({ reason: 'end_tba', nextCheckAt: null, lastCheckedAt: null, escalatedAt: '2026-10-01T00:00:00.000Z', proposal: null })).toEqual({
      reason: 'end_tba',
      nextCheckAt: null,
      lastCheckedAt: null,
      unchanged: 0,
      escalated: true,
      proposal: null,
    });
  });
});
