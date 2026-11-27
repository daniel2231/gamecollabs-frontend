import { describe, expect, it } from 'vitest';
import type { Period } from '@/schema';
import { adminPeriodLabel, followUpReasonOf, nextCheckAt, shouldEscalate } from './followup';

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


  it('관리자 기간 표기', () => {
    expect(adminPeriodLabel(p({ start: '2026-11-01', precision: 'month', endKind: 'tba' }))).toBe('2026.11 – 종료일 미발표');
    expect(adminPeriodLabel(p({ precision: 'unknown', endKind: 'tba' }))).toBe('시기 미상');
    expect(adminPeriodLabel(p({ precision: 'unknown', endKind: 'tba', expectedStart: '2027-09' }))).toBe('시기 미상 (예상 2027.09~)');
  });
});

describe('조건부 종료 후속 확인', () => {
  it('다른 일정에 묶인 경우만 다시 확인하고, 추정 종료가 지나면 멈춘다', () => {
    const tied = p({ start: '2026-10-01', endKind: 'conditional', endCondition: 'tied_event' });
    expect(followUpReasonOf('published', tied, now)).toBe('end_tied');
    expect(followUpReasonOf('published', p({ start: '2026-10-01', endKind: 'conditional', endCondition: 'sold_out' }), now)).toBeNull();
    expect(followUpReasonOf('published', p({ start: '2026-10-01', endKind: 'conditional', endCondition: 'sold_out' }), now, true)).toBe('content_tba');
    expect(followUpReasonOf('published', tied, new Date('2026-12-15T00:00:00Z'))).toBeNull();
  });

  it('관리자 기간 표기', () => {
    expect(adminPeriodLabel(p({ start: '2026-10-01', endKind: 'conditional', endCondition: 'sold_out' }))).toBe('2026.10.01 – 재고 소진 시 종료');
  });
});

describe('후속 확인 일정 (백엔드 followUpSchedule.test.ts와 같은 사례)', () => {
  const today = new Date('2026-11-27T00:00:00Z');
  const at = (d: string) => new Date(`${d}T00:00:00Z`);
  const day = (iso: string | null) => iso?.slice(0, 10) ?? null;
  const c = (period: Partial<Period>, contentTba = false, status: 'draft' | 'published' = 'published') => ({ status, period: p(period), contentTba });
  const steps = (s: ReturnType<typeof c>, unchanged: number, from: Date, n: number) => {
    const out: (string | null)[] = [];
    let t: string | null = from.toISOString();
    for (let i = 0; i < n && t; i++) {
      t = nextCheckAt(s, unchanged + i, new Date(t));
      out.push(day(t));
    }
    return out;
  };

  it('날짜 단서가 없으면 3 → 7 → 14 → 30일', () => {
    const s = c({ precision: 'unknown', endKind: 'tba' }, false, 'draft');
    expect([0, 1, 2, 3, 9].map((n) => (Date.parse(nextCheckAt(s, n, today)!) - today.getTime()) / 86_400_000)).toEqual([3, 7, 14, 30, 30]);
  });

  it('내용 미발표: 시작 14·7일 전, 그 뒤 3일마다', () => {
    const s = c({ start: '2026-12-26', end: '2026-12-27' }, true);
    expect(steps(s, 3, today, 5)).toEqual(['2026-12-12', '2026-12-19', '2026-12-22', '2026-12-25', '2026-12-26']);
  });

  it('진행 중인데 종료일이 없으면 최대 7일', () => {
    const s = c({ start: '2026-11-01', endKind: 'tba' });
    expect([1, 3, 6].map((n) => day(nextCheckAt(s, n, today)))).toEqual(['2026-12-04', '2026-12-04', '2026-12-04']);
  });

  it('시작 월: 다가갈수록 촘촘히, 그 달 안에서는 3일마다', () => {
    const s = c({ start: '2027-01-01', precision: 'month', endKind: 'tba' });
    expect(steps(s, 1, today, 6)).toEqual(['2026-12-02', '2026-12-16', '2026-12-18', '2026-12-25', '2026-12-28', '2026-12-31']);
    expect(day(nextCheckAt(s, 7, at('2027-01-10')))).toBe('2027-01-13');
  });

  it('예상 시작 시기: 멀면 60일, 열리면 7일, 지나고 30일 뒤부터 기본 간격', () => {
    const s = c({ precision: 'unknown', endKind: 'tba', expectedStart: '2027-09' }, true, 'draft');
    expect(day(nextCheckAt(s, 0, today))).toBe('2026-11-30');
    expect(day(nextCheckAt(s, 2, today))).toBe('2027-01-26');
    expect(day(nextCheckAt(s, 4, at('2027-07-01')))).toBe('2027-08-02');
    expect(day(nextCheckAt(s, 5, at('2027-09-05')))).toBe('2027-09-12');
    expect(day(nextCheckAt(s, 5, at('2027-11-01')))).toBe('2027-12-01');
  });

  it('하루보다 빠르지 않고, 확인할 것이 없으면 null', () => {
    const s = c({ start: '2026-12-26', end: '2026-12-27' }, true);
    expect(nextCheckAt(s, 3, new Date('2026-12-18T23:00:00Z'))).toBe('2026-12-19T23:00:00.000Z');
    expect(nextCheckAt(c({ start: '2026-12-01', end: '2026-12-31' }), 2, today)).toBeNull();
  });

  it('알림 기준', () => {
    const since = '2026-08-01T00:00:00.000Z';
    expect(shouldEscalate(c({ precision: 'unknown', endKind: 'tba' }, false, 'draft'), { unchanged: 3, since }, at('2026-11-29'))).toBe(true);
    expect(shouldEscalate(c({ precision: 'unknown', endKind: 'tba' }, false, 'draft'), { unchanged: 1, since }, at('2026-12-31'))).toBe(false);
    expect(shouldEscalate(c({ precision: 'unknown', endKind: 'tba', expectedStart: '2027-01' }, false, 'draft'), { unchanged: 4, since }, at('2027-03-02'))).toBe(false);
    expect(shouldEscalate(c({ precision: 'unknown', endKind: 'tba', expectedStart: '2027-01' }, false, 'draft'), { unchanged: 4, since }, at('2027-03-03'))).toBe(true);
    expect(shouldEscalate(c({ start: '2026-11-01', endKind: 'tba' }), { unchanged: 4, since }, at('2026-12-31'))).toBe(true);
    expect(shouldEscalate(c({ start: '2027-01-01', precision: 'month', endKind: 'tba' }), { unchanged: 7, since }, at('2027-01-20'))).toBe(false);
  });
});
