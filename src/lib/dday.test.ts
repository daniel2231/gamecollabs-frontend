import { describe, expect, it } from 'vitest';
import { daysLeft, localToday } from './dday';

const fixed = (start: string | null, end: string | null) => ({ start, end, precision: 'day' as const, endKind: 'fixed' as const });

describe('daysLeft', () => {
  it('종료일 당일은 0, 7일 남으면 7', () => {
    expect(daysLeft(fixed('2026-11-01', '2026-11-24'), '2026-11-24')).toBe(0);
    expect(daysLeft(fixed('2026-11-01', '2026-12-01'), '2026-11-24')).toBe(7);
  });

  it('창보다 멀거나 이미 끝났으면 null', () => {
    expect(daysLeft(fixed('2026-11-01', '2026-12-02'), '2026-11-24')).toBeNull();
    expect(daysLeft(fixed('2026-11-01', '2026-11-23'), '2026-11-24')).toBeNull();
  });

  it('시작 전이면 null', () => {
    expect(daysLeft(fixed('2026-11-25', '2026-11-26'), '2026-11-24')).toBeNull();
  });

  it('월을 넘어도 날짜 차이로 센다', () => {
    expect(daysLeft(fixed('2026-12-20', '2027-01-02'), '2026-12-30')).toBe(3);
  });

  it('종료일이 날짜로 정해지지 않으면 null', () => {
    expect(daysLeft({ ...fixed('2026-11-01', '2026-11-30'), precision: 'month' }, '2026-11-24')).toBeNull();
    expect(daysLeft({ ...fixed('2026-11-01', null), endKind: 'tba' }, '2026-11-24')).toBeNull();
    expect(daysLeft({ ...fixed('2026-11-01', '2026-11-25'), endKind: 'conditional' }, '2026-11-24')).toBeNull();
    expect(daysLeft({ ...fixed('2026-11-01', null), endKind: 'permanent' }, '2026-11-24')).toBeNull();
  });
});

describe('localToday', () => {
  it('기기 시간대의 날짜를 YYYY-MM-DD로', () => {
    expect(localToday(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
