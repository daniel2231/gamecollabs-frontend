import { describe, expect, it } from 'vitest';
import { parseCollabQuery } from './filters';
import { landingOf, landingPath } from './landing';

const q = (params: Record<string, string>) => parseCollabQuery(params);

describe('landingOf', () => {
  it('필터가 없으면 랜딩이 아니다(홈)', () => {
    expect(landingOf(q({}))).toBeNull();
  });

  it('진행 상태 하나만 걸면 랜딩', () => {
    expect(landingOf(q({ phase: 'ongoing' }))).toEqual({ param: 'phase', key: 'ongoing' });
  });

  it('상태 미상은 랜딩이 아니다', () => {
    expect(landingOf(q({ phase: 'unknown' }))).toBeNull();
  });

  it('분류 항목 하나만 걸면 랜딩, 정렬·더 보기는 무시', () => {
    expect(landingOf(q({ platform: 'platform.mobile', sort: 'recent', limit: '40' }))).toEqual({ param: 'platform', key: 'platform.mobile' });
  });

  it('항목 둘, 필터 조합, 검색어, 기간은 랜딩이 아니다', () => {
    expect(landingOf(q({ region: 'region.japan,region.korea' }))).toBeNull();
    expect(landingOf(q({ region: 'region.japan', platform: 'platform.pc' }))).toBeNull();
    expect(landingOf(q({ phase: 'ongoing', category: 'category.in_game' }))).toBeNull();
    expect(landingOf(q({ category: 'category.in_game', q: '태고' }))).toBeNull();
    expect(landingOf(q({ phase: 'ended', from: '2026-01' }))).toBeNull();
  });
});

describe('landingPath', () => {
  it('해당 필터 하나만 남긴 쿼리 문자열', () => {
    expect(landingPath({ param: 'phase', key: 'ongoing' })).toBe('?phase=ongoing');
    expect(landingPath({ param: 'partner_category', key: 'partner_category.anime_manga' })).toBe('?partner_category=partner_category.anime_manga');
  });
});
