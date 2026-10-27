import { describe, expect, it } from 'vitest';
import { COLLECTION_START, addMonths, collectionStartLabel, fillMonths, monthColumns, monthRange, niceTicks, parseStatsYear, peakMonth, percentOf, recentMonths, yearMonths, yearOverYear } from './stats';

const now = new Date('2026-10-27T03:00:00Z');

describe('months', () => {
  it('adds months across years', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2025-11', 3)).toBe('2026-02');
    expect(monthRange('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });

  it('fills empty months with zero and marks past, current and future', () => {
    const buckets = fillMonths([{ month: '2026-09', count: 2 }], '2026-08', '2026-11', now);
    expect(buckets).toEqual([
      { month: '2026-08', count: 0, state: 'past' },
      { month: '2026-09', count: 2, state: 'past' },
      { month: '2026-10', count: 0, state: 'current' },
      { month: '2026-11', count: 0, state: 'future' },
    ]);
  });

  it('starts at the collection month, then keeps the last 24 months, plus planned months up to six ahead', () => {
    const early = recentMonths([{ month: '2026-09', count: 1 }], now);
    expect(early[0]!.month).toBe(COLLECTION_START);
    expect(early.at(-1)!.month).toBe('2026-10');
    expect(recentMonths([], new Date('2029-01-15T00:00:00Z'))).toHaveLength(24);
    const planned = recentMonths([{ month: '2027-01', count: 1 }, { month: '2028-01', count: 1 }], now);
    expect(planned.at(-1)).toEqual({ month: '2027-01', count: 1, state: 'future' });
  });

  it('covers a whole year for year reports, from the collection month in the first year', () => {
    const months = yearMonths([{ month: '2027-03', count: 4 }], 2027, now);
    expect(months.map((m) => m.month)).toEqual(monthRange('2027-01', '2027-12'));
    expect(peakMonth(months)).toEqual({ month: '2027-03', count: 4, state: 'future' });
    expect(peakMonth(yearMonths([], 2027, now))).toBeNull();
    expect(yearMonths([], 2026, now)[0]!.month).toBe('2026-04');
  });
});

describe('numbers', () => {
  it('picks clean ticks from zero', () => {
    expect(niceTicks(0)).toEqual([0, 1]);
    expect(niceTicks(3)).toEqual([0, 1, 2, 3]);
    expect(niceTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(38)).toEqual([0, 10, 20, 30, 40]);
    expect(niceTicks(120)).toEqual([0, 50, 100, 150]);
  });

  it('compares with the previous year', () => {
    expect(yearOverYear(12, 8)).toEqual({ diff: 4, ratio: 0.5 });
    expect(yearOverYear(3, 0)).toEqual({ diff: 3, ratio: null });
    expect(yearOverYear(3, null)).toBeNull();
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(1, 0)).toBe(0);
  });

  it('accepts only years that have collabs', () => {
    const years = [{ year: 2025, count: 3 }, { year: 2026, count: 0 }];
    expect(parseStatsYear('2025', years)).toBe(2025);
    expect(parseStatsYear('2026', years)).toBeNull();
    expect(parseStatsYear('2024', years)).toBeNull();
    expect(parseStatsYear('25', years)).toBeNull();
    expect(parseStatsYear('2025.json', years)).toBeNull();
  });
});

describe('monthColumns', () => {
  it('labels every month up to a year and quarters beyond, with the year on January', () => {
    const short = fillMonths([], '2026-11', '2027-02', now);
    expect(monthColumns(short, 'en').map((c) => c.axisLabel)).toEqual(['Nov', 'Dec', '2027', 'Feb']);
    expect(monthColumns(fillMonths([], '2027-01', '2027-03', now), 'ko')[0]).toMatchObject({ key: '2027-01', label: '2027년 1월', axisLabel: '1월', count: 0, state: 'future' });
    const long = monthColumns(fillMonths([], '2026-04', '2027-07', now), 'en').map((c) => c.axisLabel);
    expect(long.slice(0, 4)).toEqual(['Apr', undefined, undefined, 'Jul']);
    expect(long[9]).toBe('2027');
  });

  it('names the collection start month', () => {
    expect(collectionStartLabel('ko')).toBe('2026년 4월');
    expect(collectionStartLabel('en')).toBe('April 2026');
  });
});
