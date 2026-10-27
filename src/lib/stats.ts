/**
 * 통계 페이지 계산. 백엔드는 건수가 있는 달만 주므로 빈 달을 0으로 채우고, 축 눈금과 전년 대비를 구한다.
 * 순수 함수만 둔다(테스트 대상). 달은 모두 `YYYY-MM`, 시각은 UTC 기준이다(백엔드 집계와 같다).
 */
import type { Stats } from '@/schema';

/** 통계 홈 경로(언어 접두어 뒤). 연도 리포트는 `/stats/2026` */
export const STATS_PATH = '/stats';

/** 수집을 시작한 달. 그 전 달은 수집하지 않았으므로 월별 차트에 넣지 않는다 */
export const COLLECTION_START = '2026-04';
/** 통계 홈의 월별 차트 폭: 이번 달까지 최근 24개월(수집 시작 달보다 앞으로는 가지 않는다) */
export const RECENT_MONTHS = 24;
/** 순위마다 보여 줄 개수 */
export const RANK_SIZE = 5;
/** 분류별 분포에서 처음 보여 줄 개수(나머지는 '더 보기') */
export const BAR_LIST_SIZE = 5;
/** 예정 콜라보가 있으면 이번 달 뒤로 최대 이만큼 더 보여준다 */
export const FUTURE_MONTHS = 6;

export type MonthState = 'past' | 'current' | 'future';
export type MonthBucket = { month: string; count: number; state: MonthState };

export function monthOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** `YYYY-MM`에 n개월을 더한다(음수면 뺀다) */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  return monthOf(new Date(Date.UTC(y!, m! - 1 + n, 1)));
}

/** from부터 to까지(둘 다 포함) 모든 달 */
export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let m = from; m <= to; m = addMonths(m, 1)) out.push(m);
  return out;
}

/** 범위의 모든 달을 채운다. 건수가 없는 달은 0, 이번 달 기준으로 지난·이번·예정을 표시한다 */
export function fillMonths(monthly: Stats['monthly'], from: string, to: string, now: Date): MonthBucket[] {
  const counts = new Map(monthly.map((m) => [m.month, m.count]));
  const current = monthOf(now);
  return monthRange(from, to).map((month) => ({
    month,
    count: counts.get(month) ?? 0,
    state: month < current ? 'past' : month === current ? 'current' : 'future',
  }));
}

/** 통계 홈: 수집 시작 달(최근 24개월보다 늦으면 그 달)부터 이번 달까지, 예정 콜라보가 있으면 그 달까지(최대 6개월 뒤) */
export function recentMonths(monthly: Stats['monthly'], now: Date): MonthBucket[] {
  const current = monthOf(now);
  const limit = addMonths(current, FUTURE_MONTHS);
  const lastPlanned = monthly
    .map((m) => m.month)
    .filter((m) => m > current && m <= limit)
    .at(-1);
  return fillMonths(monthly, laterMonth(addMonths(current, 1 - RECENT_MONTHS), COLLECTION_START), lastPlanned ?? current, now);
}

const laterMonth = (a: string, b: string) => (a > b ? a : b);

/** 연도 리포트: 그해 1~12월(수집을 시작한 해는 시작 달부터) */
export function yearMonths(monthly: Stats['monthly'], year: number, now: Date): MonthBucket[] {
  return fillMonths(monthly, laterMonth(`${year}-01`, COLLECTION_START), `${year}-12`, now);
}

/** 0부터 시작하는 깔끔한 눈금(1·2·5 단위), 칸은 4개 안팎. 맨 위 눈금이 축의 최댓값이다 */
export function niceTicks(max: number, target = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 5, 10].map((s) => s * pow).find((s) => s >= raw) ?? 10 * pow);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return ticks;
}

/** 전년 대비. 전년이 0이면 비율은 없다 */
export function yearOverYear(current: number, previous: number | null): { diff: number; ratio: number | null } | null {
  if (previous === null) return null;
  return { diff: current - previous, ratio: previous > 0 ? (current - previous) / previous : null };
}

/** 주소의 연도 부분: 네 자리 숫자이고 시작한 콜라보가 있는 해만 */
export function parseStatsYear(raw: string, years: Stats['years']): number | null {
  if (!/^\d{4}$/.test(raw)) return null;
  const year = Number(raw);
  return years.some((y) => y.year === year && y.count > 0) ? year : null;
}

/** 전체 대비 비율(0~100, 정수 반올림). 전체가 0이면 0 */
export function percentOf(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

/** 가장 많은 달(동률이면 앞선 달). 모두 0이면 null */
export function peakMonth(buckets: MonthBucket[]): MonthBucket | null {
  return buckets.reduce<MonthBucket | null>((best, b) => (b.count > 0 && (!best || b.count > best.count) ? b : best), null);
}

/**
 * 월 막대의 표기. 툴팁·표는 '2026년 10월'처럼 전체, 축은 글자가 겹치지 않게 고른 달만 짧게 쓴다.
 * 13개월 이상이면 1월은 연도, 4·7·10월은 짧은 달 이름만 쓰고, 그보다 짧으면 모든 달을 쓴다.
 * 해가 바뀌는 1월(첫 칸이 아닐 때)은 달 이름 대신 연도를 쓴다.
 */
export function monthColumns(buckets: MonthBucket[], locale: string) {
  const long = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', timeZone: 'UTC' });
  const short = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
  const every = buckets.length <= 12;
  return buckets.map((b, i) => {
    const [y, m] = b.month.split('-').map(Number);
    const date = new Date(Date.UTC(y!, m! - 1, 1));
    const axisLabel = m === 1 && i > 0 ? String(y) : every || (m! - 1) % 3 === 0 ? short.format(date) : undefined;
    return { key: b.month, label: long.format(date), axisLabel, count: b.count, state: b.state };
  });
}

/** 수집 시작 달을 그 언어로(예: 2026년 4월, April 2026) */
export function collectionStartLabel(locale: string): string {
  const [y, m] = COLLECTION_START.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y!, m! - 1, 1)));
}
