import { describe, expect, it } from 'vitest';
import { computePhase } from './phase';

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe('computePhase', () => {
  it('시작일이 없거나 정밀도가 unknown이면 unknown', () => {
    expect(computePhase({ start: null, end: null, precision: 'day', endKind: 'tba' })).toBe('unknown');
    expect(computePhase({ start: '2026-01-01', end: null, precision: 'unknown', endKind: 'tba' })).toBe('unknown');
  });

  it('시작 전이면 upcoming, 시작일 당일부터 ongoing', () => {
    const p = { start: '2026-10-10', end: '2026-10-20', precision: 'day', endKind: 'fixed' } as const;
    expect(computePhase(p, at('2026-10-09'))).toBe('upcoming');
    expect(computePhase(p, at('2026-10-10'))).toBe('ongoing');
    expect(computePhase(p, at('2026-10-20'))).toBe('ongoing'); // 종료일 당일은 진행 중
    expect(computePhase(p, at('2026-10-21'))).toBe('ended');
  });

  it('월 단위 정확도는 그 달 전체를 범위로 본다', () => {
    const p = { start: '2026-10-01', end: '2026-11-01', precision: 'month', endKind: 'fixed' } as const;
    expect(computePhase(p, at('2026-09-30'))).toBe('upcoming');
    expect(computePhase(p, at('2026-10-06'))).toBe('ongoing');
    expect(computePhase(p, at('2026-11-30'))).toBe('ongoing');
    expect(computePhase(p, at('2026-12-01'))).toBe('ended');
  });

  it('상시·미발표는 끝나지 않는다', () => {
    expect(computePhase({ start: '2020-01-01', end: null, precision: 'day', endKind: 'permanent' }, at('2030-01-01'))).toBe('ongoing');
    expect(computePhase({ start: '2020-01-01', end: '2020-02-01', precision: 'day', endKind: 'tba' }, at('2030-01-01'))).toBe('ongoing');
  });
});
