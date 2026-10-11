import { describe, expect, it } from 'vitest';
import { groupByStartMonth } from './format';

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
