import { describe, expect, it } from 'vitest';
import { hasActiveFilters, parseCollabQuery, serializeCollabQuery, toggleFacet } from './filters';

describe('URL 필터 상태', () => {
  it('쉼표 구분과 반복 파라미터 둘 다 읽는다', () => {
    const q = parseCollabQuery({ region: ['region.japan,region.korea', 'region.global'], platform: 'platform.mobile' });
    expect(q.region).toEqual(['region.japan', 'region.korea', 'region.global']);
    expect(q.platform).toEqual(['platform.mobile']);
  });

  it('잘못된 값은 버리고 기본값을 쓴다', () => {
    const q = parseCollabQuery({ phase: 'nope', sort: 'x', from: '2026-1', limit: '999' });
    expect(q.phase).toBeUndefined();
    expect(q.sort).toBe('start_desc');
    expect(q.from).toBeUndefined();
    expect(q.limit).toBe(100);
  });

  it('직렬화 후 다시 읽으면 같은 쿼리', () => {
    const q = parseCollabQuery({ q: '진격', partner_category: 'partner_category.anime_manga', region: 'region.japan', from: '2026-01', to: '2026-12', phase: 'ongoing', sort: 'start_asc' });
    const s = serializeCollabQuery(q);
    expect(parseCollabQuery(Object.fromEntries(new URLSearchParams(s)))).toEqual(q);
    expect(s).not.toContain('limit');
  });

  it('토글하면 더보기(limit)가 초기화된다', () => {
    const q = parseCollabQuery({ limit: '60' });
    const next = toggleFacet(q, 'region', 'region.japan');
    expect(next.region).toEqual(['region.japan']);
    expect(next.limit).toBe(20);
    expect(toggleFacet(next, 'region', 'region.japan').region).toEqual([]);
    expect(hasActiveFilters(next)).toBe(true);
    expect(hasActiveFilters(parseCollabQuery({ sort: 'recent' }))).toBe(false);
  });
});
