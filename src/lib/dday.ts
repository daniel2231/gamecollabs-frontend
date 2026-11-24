import type { Period } from '@/schema';

/** 종료까지 이만큼 남았을 때부터 카드에 D-day를 붙인다 */
export const DDAY_WINDOW = 7;
/** 이만큼 남으면 강조색으로 바꾼다 */
export const DDAY_URGENT = 3;

const DAY = 86_400_000;
const dayNumber = (date: string) => {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d) / DAY;
};

/** 보는 사람 기준 오늘(YYYY-MM-DD). 콜라보 날짜는 현지 날짜로 발표되므로 UTC가 아니라 기기 시간대를 쓴다 */
export function localToday(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * 진행 중인 콜라보의 종료까지 남은 날(종료일 당일은 0). 붙이지 않을 때는 null:
 * 종료일이 날짜까지 정해지지 않았거나(월 단위·미발표·상시·조건부), 시작 전이거나, 이미 끝났거나, 창보다 멀 때
 */
export function daysLeft(period: Period, today: string, window = DDAY_WINDOW): number | null {
  if (period.endKind !== 'fixed' || period.precision !== 'day' || !period.end || !period.start) return null;
  if (period.start > today) return null;
  const left = dayNumber(period.end) - dayNumber(today);
  return left >= 0 && left <= window ? left : null;
}
