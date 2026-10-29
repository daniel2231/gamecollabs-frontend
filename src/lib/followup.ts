import type { CollabStatus, FollowUpReason, Period } from '@/schema';
import { formatPeriod } from '@/lib/format';

/** 관리자 화면 표기 */
export const FOLLOW_UP_REASON_LABEL: Record<FollowUpReason, string> = {
  start_tba: '시작일 미발표',
  month_only: '시작 월만 앎',
  end_tba: '종료일 미발표',
  end_missing: '종료일 누락',
  content_tba: '내용 미발표',
};

/** 사유마다 찾아야 할 정보(관리자 안내) */
export const FOLLOW_UP_REASON_HINT: Record<FollowUpReason, string> = {
  start_tba: '시작일과 내용이 발표되면 채웁니다.',
  month_only: '정확한 시작일이 나오면 일 단위로 바꿉니다.',
  end_tba: '종료일이 나오면 넣고, 계속 남는 콘텐츠면 “상시”로 바꿉니다.',
  end_missing: '종료 방식이 “기간 확정”인데 종료일이 비어 있습니다. 종료일을 넣거나 “미발표”·“상시”로 바꿉니다.',
  content_tba: '콜라보 내용(아이템·스킨·이벤트 등)이 발표되면 요약을 채우고 “내용 미발표”를 해제합니다.',
};

/** 백엔드에서 연속 무변화 이 횟수부터 알림(escalated)으로 넘어간다 */
export const ESCALATE_AFTER = 5;

/** 첫 확인 3일, 이후 변화가 없을 때마다 7 → 14 → 30일 (백엔드 lib/followUp.ts와 같은 값) */
const CHECK_INTERVAL_DAYS = [3, 7, 14, 30] as const;

export function nextCheckAt(unchanged: number, from: Date = new Date()): string {
  const days = CHECK_INTERVAL_DAYS[Math.min(unchanged, CHECK_INTERVAL_DAYS.length - 1)]!;
  return new Date(from.getTime() + days * 86_400_000).toISOString();
}

const utc = (date: string) => {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return { y, m, d };
};

/**
 * 백엔드 followUpReasonOf와 같은 규칙(목 API용). 화면 기간은 날짜가 `YYYY-MM-DD`(월 정밀도면 1일)다.
 * null이면 더 확인할 것이 없다(날짜·내용 확정, 종료, 보관). 빠진 날짜가 내용보다 먼저다.
 */
export function followUpReasonOf(status: CollabStatus, period: Period, now: Date = new Date(), contentTba = false): FollowUpReason | null {
  if (status === 'archived') return null;
  if (!period.start) return 'start_tba';
  const t = now.getTime();
  if (period.end) {
    const { y, m, d } = utc(period.end);
    const until = period.precision === 'month' ? Date.UTC(y, m, 1) : Date.UTC(y, m - 1, d + 1);
    if (until <= t) return null;
  }
  if (period.precision === 'month') {
    const { y, m } = utc(period.start);
    if (t < Date.UTC(y, m, 1)) return 'month_only';
  }
  if (!period.end) {
    if (period.endKind === 'tba') return 'end_tba';
    if (period.endKind === 'fixed') return 'end_missing';
  }
  if (contentTba) return 'content_tba';
  return null;
}

/** 관리자 화면(한국어 고정)의 기간 표기 */
export function adminPeriodLabel(period: Period): string {
  return formatPeriod(period, { unknown: '시기 미상', permanent: '상시', tba: '종료일 미발표' });
}
