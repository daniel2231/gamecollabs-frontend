import type { Period } from '@/schema';

/** 2026-10-06 → 2026.10.06, month 정밀도면 2026.10 */
export function formatDate(date: string | null, precision: Period['precision']): string | null {
  if (!date || precision === 'unknown') return null;
  const [y, m, d] = date.split('-');
  return precision === 'month' ? `${y}.${m}` : `${y}.${m}.${d}`;
}

export type PeriodLabels = { unknown: string; permanent: string; tba: string };

export function formatPeriod(period: Period, labels: PeriodLabels): string {
  const start = formatDate(period.start, period.precision);
  if (!start) return labels.unknown;
  if (period.endKind === 'permanent') return `${start} – ${labels.permanent}`;
  if (period.endKind === 'tba' || !period.end) return `${start} – ${labels.tba}`;
  return `${start} – ${formatDate(period.end, period.precision)}`;
}

/** YYYY-MM-DD → YYYY.MM (타임라인 등 짧은 표기) */
export function formatMonth(date: string | null): string | null {
  if (!date) return null;
  const [y, m] = date.split('-');
  return `${y}.${m}`;
}

/** 시작 월(YYYY-MM)로 연속 구간을 묶는다. 입력 순서를 그대로 유지하고, 시기 미상은 key ''로 묶는다 */
export function groupByStartMonth<T extends { period: Period }>(items: T[]): { key: string; items: T[] }[] {
  const groups: { key: string; items: T[] }[] = [];
  for (const item of items) {
    const { start, precision } = item.period;
    const key = start && precision !== 'unknown' ? start.slice(0, 7) : '';
    const last = groups.at(-1);
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  }
  return groups;
}
