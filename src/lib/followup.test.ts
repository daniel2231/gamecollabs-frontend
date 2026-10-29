import { describe, expect, it } from 'vitest';
import type { Period } from '@/schema';
import { adminPeriodLabel, followUpReasonOf, nextCheckAt } from './followup';

const now = new Date('2026-10-13T00:00:00Z');
const p = (over: Partial<Period>): Period => ({ start: null, end: null, precision: 'day', endKind: 'fixed', ...over });

describe('후속 확인 사유 (백엔드와 같은 규칙)', () => {
  it('비어 있는 날짜를 사유로 바꾼다', () => {
    expect(followUpReasonOf('draft', p({ precision: 'unknown', endKind: 'tba' }), now)).toBe('start_tba');
    expect(followUpReasonOf('published', p({ start: '2026-11-01', precision: 'month', endKind: 'tba' }), now)).toBe('month_only');
    // 시작 월이 지나면 종료일을 본다
    expect(followUpReasonOf('published', p({ start: '2026-09-01', precision: 'month', endKind: 'tba' }), now)).toBe('end_tba');
    expect(followUpReasonOf('published', p({ start: '2026-10-01' }), now)).toBe('end_missing');
  });

  it('날짜가 다 있거나 끝났거나 상시·보관이면 확인하지 않는다', () => {
    expect(followUpReasonOf('published', p({ start: '2026-10-01', end: '2026-10-31' }), now)).toBeNull();
    expect(followUpReasonOf('published', p({ start: '2026-08-01', end: '2026-09-30' }), now)).toBeNull();
    expect(followUpReasonOf('published', p({ start: '2026-10-01', endKind: 'permanent' }), now)).toBeNull();
    expect(followUpReasonOf('archived', p({ endKind: 'tba' }), now)).toBeNull();
  });

  it('날짜가 다 있으면 내용 미발표를 확인한다', () => {
    expect(followUpReasonOf('published', p({ start: '2026-10-01', end: '2026-10-31' }), now, true)).toBe('content_tba');
    expect(followUpReasonOf('published', p({ start: '2026-10-01', endKind: 'permanent' }), now, true)).toBe('content_tba');
    // 빠진 날짜가 먼저, 끝났거나 보관이면 확인하지 않는다
    expect(followUpReasonOf('draft', p({ precision: 'unknown', endKind: 'tba' }), now, true)).toBe('start_tba');
    expect(followUpReasonOf('published', p({ start: '2026-08-01', end: '2026-09-30' }), now, true)).toBeNull();
    expect(followUpReasonOf('archived', p({ start: '2026-10-01', end: '2026-10-31' }), now, true)).toBeNull();
  });

  it('3 → 7 → 14 → 30일 간격', () => {
    expect([0, 1, 2, 3, 8].map((n) => (Date.parse(nextCheckAt(n, now)) - now.getTime()) / 86_400_000)).toEqual([3, 7, 14, 30, 30]);
  });

  it('관리자 기간 표기', () => {
    expect(adminPeriodLabel(p({ start: '2026-11-01', precision: 'month', endKind: 'tba' }))).toBe('2026.11 – 종료일 미발표');
    expect(adminPeriodLabel(p({ precision: 'unknown', endKind: 'tba' }))).toBe('시기 미상');
  });
});
