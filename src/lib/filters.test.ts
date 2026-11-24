import { describe, expect, it } from 'vitest';
import { entitySuggestions, hasActiveFilters, parseCollabQuery, serializeCollabQuery, toggleFacet } from './filters';
import type { CollabSummary, PartyRef } from '@/schema';

describe('URL 필터 상태', () => {
  it('쉼표 구분과 반복 파라미터 둘 다 읽는다', () => {
    const q = parseCollabQuery({ region: ['region.japan,region.korea', 'region.global'], platform: 'platform.mobile' });
    expect(q.region).toEqual(['region.japan', 'region.korea', 'region.global']);
    expect(q.platform).toEqual(['platform.mobile']);
  });

  it('잘못된 값은 버리고 기본값을 쓴다', () => {
    const q = parseCollabQuery({ phase: 'nope', sort: 'x', from: '2026-1', limit: '999' });
    expect(q.phase).toBeUndefined();
    expect(q.sort).toBe('current');
    expect(q.from).toBeUndefined();
    expect(q.limit).toBe(100);
  });

  it('직렬화 후 다시 읽으면 같은 쿼리', () => {
    const q = parseCollabQuery({ q: '진격', partner_category: 'partner_category.anime_manga', region: 'region.japan', from: '2026-01', to: '2026-12', phase: 'ongoing', sort: 'start_asc' });
    const s = serializeCollabQuery(q);
    expect(parseCollabQuery(Object.fromEntries(new URLSearchParams(s)))).toEqual(q);
    expect(s).not.toContain('limit');
  });

  it('작품·회사 고정을 읽고 쓴다. 경로 문자가 든 값은 버린다', () => {
    const q = parseCollabQuery({ property: 'genshin-impact', company: 'hoyoverse', region: 'region.korea', phase: 'ongoing' });
    expect(q.property).toBe('genshin-impact');
    expect(q.company).toBe('hoyoverse');
    const s = serializeCollabQuery(q);
    expect(s).toContain('property=genshin-impact');
    expect(parseCollabQuery(Object.fromEntries(new URLSearchParams(s)))).toEqual(q);
    expect(parseCollabQuery({ property: '../admin' }).property).toBeUndefined();
    expect(parseCollabQuery({ property: 'a b' }).property).toBeUndefined();
    expect(hasActiveFilters(parseCollabQuery({ property: 'genshin-impact' }))).toBe(true);
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

const party = (slug: string, value: string, role: PartyRef['role'] = 'host', original: string | null = null): PartyRef => ({
  slug,
  role,
  kind: { key: 'partner_category.game', label: '게임' },
  name: { value, fallback: false, original },
});
const card = (...parties: PartyRef[]) => ({ parties }) as unknown as CollabSummary;

describe('entitySuggestions', () => {
  const items = [
    card(party('genshin', '원신'), party('kfc', 'KFC', 'partner')),
    card(party('genshin', '원신'), party('ufotable', '유포테이블', 'partner')),
    card(party('honkai', '붕괴: 스타레일', 'host', '崩壊：スターレイル'), party('genshin-cafe', '원신 카페', 'partner')),
  ];

  it('이름에 검색어가 든 작품을 많이 나온 순으로', () => {
    expect(entitySuggestions(items, '원신').map((s) => s.slug)).toEqual(['genshin', 'genshin-cafe']);
  });

  it('검색어 안에 이름이 들어 있어도 맞는다', () => {
    expect(entitySuggestions(items, '원신 한국').map((s) => s.slug)).toEqual(['genshin']);
  });

  it('원어 이름과 대소문자·공백 차이도 맞춘다', () => {
    expect(entitySuggestions(items, '崩壊').map((s) => s.slug)).toEqual(['honkai']);
    expect(entitySuggestions(items, 'k f c').map((s) => s.slug)).toEqual(['kfc']);
  });

  it('검색어가 없으면 비어 있다', () => {
    expect(entitySuggestions(items, undefined)).toEqual([]);
  });
});
