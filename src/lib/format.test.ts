import { describe, expect, it } from 'vitest';
import { groupByPhase, groupByStartMonth, originalName } from './format';

const item = (slug: string, start: string | null, precision: 'day' | 'month' | 'unknown' = 'day') => ({
  slug,
  period: { start, end: null, precision, endKind: 'tba' } as const,
});

describe('groupByStartMonth', () => {
  it('같은 달끼리 묶고 입력 순서를 유지한다', () => {
    const groups = groupByStartMonth([item('a', '2026-10-20'), item('b', '2026-10-01'), item('c', '2026-09-15', 'month'), item('d', null)]);
    expect(groups.map((g) => [g.key, g.items.map((i) => i.slug)])).toEqual([
      ['2026-10', ['a', 'b']],
      ['2026-09', ['c']],
      ['', ['d']],
    ]);
  });

  it('정밀도가 unknown이면 날짜가 있어도 시기 미상으로 본다', () => {
    expect(groupByStartMonth([item('a', '2026-10-01', 'unknown')])[0]!.key).toBe('');
  });
});

describe('groupByPhase', () => {
  it('같은 진행 상태끼리 묶고 입력 순서를 유지한다', () => {
    const groups = groupByPhase([
      { slug: 'a', phase: 'ongoing' as const },
      { slug: 'b', phase: 'ongoing' as const },
      { slug: 'c', phase: 'upcoming' as const },
      { slug: 'd', phase: 'ended' as const },
    ]);
    expect(groups.map((g) => [g.key, g.items.map((i) => i.slug)])).toEqual([
      ['ongoing', ['a', 'b']],
      ['upcoming', ['c']],
      ['ended', ['d']],
    ]);
  });
});

describe('originalName', () => {
  it('원어 이름이 한국어·영어 이름과 같으면 숨긴다', () => {
    expect(originalName({ name: { original: 'Blizzard Entertainment' }, nameKo: '블리자드 엔터테인먼트', nameEn: 'Blizzard Entertainment' })).toBeNull();
    expect(originalName({ name: { original: null }, nameKo: '가루비', nameEn: 'Calbee' })).toBeNull();
  });

  it('다른 언어의 원어 이름은 보여준다', () => {
    expect(originalName({ name: { original: '進撃の巨人' }, nameKo: '진격의 거인', nameEn: 'Attack on Titan' })).toBe('進撃の巨人');
  });
});
