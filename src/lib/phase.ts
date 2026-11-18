import { CONDITIONAL_DEFAULT_DAYS, type Period, type Phase } from '@/schema';

/** 날짜 문자열(YYYY-MM-DD, UTC)을 정밀도에 맞춰 구간 시작 시각으로 */
function startOf(date: string, precision: Period['precision']): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return precision === 'month' ? Date.UTC(y, m - 1, 1) : Date.UTC(y, m - 1, d);
}

/** 날짜 문자열을 정밀도에 맞춰 구간 끝(다음 구간 시작) 시각으로 */
function endOf(date: string, precision: Period['precision']): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return precision === 'month' ? Date.UTC(y, m, 1) : Date.UTC(y, m - 1, d + 1);
}

/**
 * 진행 상태는 저장하지 않고 start/end와 요청 시각으로 계산한다(PRD 기능 요구사항).
 * - 시작일이 없거나 정밀도가 unknown이면 unknown
 * - 시작 전이면 upcoming
 * - endKind가 fixed이고 종료일이 지났으면 ended
 * - conditional이면 예상 종료 시기, 없으면 시작 후 CONDITIONAL_DEFAULT_DAYS일이 지나면 ended(추정)
 * - 그 밖에는 ongoing (permanent, tba 포함)
 */
export function computePhase(period: Period, now: Date = new Date()): Phase {
  if (!period.start || period.precision === 'unknown') return 'unknown';
  const t = now.getTime();
  const start = startOf(period.start, period.precision);
  if (t < start) return 'upcoming';
  if (period.endKind === 'fixed' && period.end && t >= endOf(period.end, period.precision)) return 'ended';
  if (period.endKind === 'conditional') {
    const expected = period.expectedEnd;
    const until = expected
      ? endOf(expected.length === 7 ? `${expected}-01` : expected, expected.length === 7 ? 'month' : 'day')
      : start + CONDITIONAL_DEFAULT_DAYS * 86_400_000;
    if (t >= until) return 'ended';
  }
  return 'ongoing';
}
