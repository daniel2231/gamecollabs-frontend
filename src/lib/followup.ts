import type { CollabStatus, FollowUpReason, Period } from '@/schema';
import { formatPeriod } from '@/lib/format';
import { computePhase } from '@/lib/phase';

/** 관리자 화면 표기 */
export const FOLLOW_UP_REASON_LABEL: Record<FollowUpReason, string> = {
  start_tba: '시작일 미발표',
  month_only: '시작 월만 앎',
  end_tba: '종료일 미발표',
  end_missing: '종료일 누락',
  end_tied: '종료 기준 일정 미발표',
  content_tba: '내용 미발표',
};

/** 사유마다 찾아야 할 정보(관리자 안내) */
export const FOLLOW_UP_REASON_HINT: Record<FollowUpReason, string> = {
  start_tba: '시작일과 내용이 발표되면 채웁니다.',
  month_only: '정확한 시작일이 나오면 일 단위로 바꿉니다.',
  end_tba: '종료일이 나오면 넣고, 계속 남는 콘텐츠면 “상시”, 재고 소진·다른 일정처럼 조건으로 끝나면 “조건부”로 바꿉니다.',
  end_missing: '종료 방식이 “기간 확정”인데 종료일이 비어 있습니다. 종료일을 넣거나 “미발표”·“상시”로 바꿉니다.',
  end_tied: '종료 기준이 되는 일정(예: 다음 업데이트 점검일)이 발표되면 그 날짜를 종료일로 넣고 “종료일 지정”으로 바꿉니다.',
  content_tba: '콜라보 내용(아이템·스킨·이벤트 등)이 발표되면 요약을 채우고 “내용 미발표”를 해제합니다.',
};

/** 백엔드 lib/followUp.ts와 같은 값 */
const DAY = 86_400_000;
/** 연속 무변화 횟수에 따른 기본 간격: 첫 확인 3일, 이후 7 → 14 → 30일 */
const CHECK_INTERVAL_DAYS = [3, 7, 14, 30] as const;
/** 날짜 기준 제한. 기준일은 시작 전 콜라보의 시작일, month_only의 시작 월 1일, start_tba의 예상 시작 시기 */
export const SCHEDULE = { leadDays: [30, 14, 7, 0], nearDays: 7, nearMaxDays: 3, runningMaxDays: 7, farDays: 60 } as const;
/** 알림(escalated) 조건 */
export const ESCALATE = { minChecks: 2, maxChecks: 8, startTbaDays: 120, expectedGraceDays: 30, runningDays: 60, contentStartedDays: 7 } as const;

/** 사유마다 관리자 알림으로 넘어가는 조건(관리자 안내) */
export const FOLLOW_UP_ESCALATION_HINT: Record<FollowUpReason, string> = {
  start_tba: `예상 시작 시기가 지나고 ${ESCALATE.expectedGraceDays}일 뒤(없으면 대상이 된 지 ${ESCALATE.startTbaDays}일 뒤)`,
  month_only: '알림 없음(그 달이 끝나면 종료일 확인으로 바뀜)',
  end_tba: `시작 후 ${ESCALATE.runningDays}일`,
  end_missing: `시작 후 ${ESCALATE.runningDays}일`,
  end_tied: `시작 후 ${ESCALATE.runningDays}일`,
  content_tba: `시작 후 ${ESCALATE.contentStartedDays}일`,
};

const dayMs = (date: string) => {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number?];
  return Date.UTC(y, m - 1, d ?? 1);
};

/** 예상 시작 시기가 끝나는 시각(그 날 다음 날, 또는 다음 달 1일) */
function expectedWindowEnd(expectedStart: string): number {
  const [y, m] = expectedStart.split('-').map(Number) as [number, number];
  return expectedStart.length === 7 ? Date.UTC(y, m, 1) : dayMs(expectedStart) + DAY;
}

type Subject = { status: CollabStatus; period: Period; contentTba?: boolean };

function anchorOf(c: Subject, reason: FollowUpReason, t: number): number | null {
  const p = c.period;
  if (reason === 'start_tba') return !p.start && p.expectedStart ? dayMs(p.expectedStart) : null;
  if (reason === 'month_only') return p.start ? dayMs(p.start) : null;
  return p.start && dayMs(p.start) > t ? dayMs(p.start) : null;
}

/**
 * 백엔드 nextCheckAt과 같은 규칙(목 API용). 기본 간격에 날짜 기준 제한을 더한다: 기준일 30·14·7일 전과 당일에는 꼭 확인,
 * 기준일 7일 전부터와 시작 월 안에서는 3일마다, 시작했는데 종료일·내용이 없으면(예상 시작 시기가 열린 start_tba도) 최대 7일,
 * 기준일이 30일보다 멀면 첫 확인 뒤로는 60일. 하루보다 빠르지 않다. null이면 더 확인할 것이 없다.
 */
export function nextCheckAt(c: Subject, unchanged: number, from: Date = new Date()): string | null {
  const reason = followUpReasonOf(c.status, c.period, from, c.contentTba);
  if (!reason) return null;
  const p = c.period;
  const t = from.getTime();
  let days: number = CHECK_INTERVAL_DAYS[Math.min(unchanged, CHECK_INTERVAL_DAYS.length - 1)]!;
  let max = Infinity;
  let checkpoint = Infinity;
  const anchor = anchorOf(c, reason, t);
  if (anchor !== null) {
    const lead = (anchor - t) / DAY;
    if (lead > SCHEDULE.leadDays[0] && unchanged > 0) days = Math.max(days, SCHEDULE.farDays);
    if (lead >= 0 && lead <= SCHEDULE.nearDays) max = SCHEDULE.nearMaxDays;
    for (const d of SCHEDULE.leadDays) {
      const at = anchor - d * DAY;
      if (at > t) checkpoint = Math.min(checkpoint, at);
    }
  }
  const started = !!p.start && dayMs(p.start) <= t;
  if (reason === 'month_only' && started) max = Math.min(max, SCHEDULE.nearMaxDays);
  if (reason === 'start_tba' && p.expectedStart && dayMs(p.expectedStart) <= t && t < expectedWindowEnd(p.expectedStart) + ESCALATE.expectedGraceDays * DAY) {
    max = Math.min(max, SCHEDULE.runningMaxDays);
  }
  if (reason !== 'start_tba' && reason !== 'month_only' && started) max = Math.min(max, SCHEDULE.runningMaxDays);
  const next = Math.min(t + Math.min(days, max) * DAY, checkpoint);
  return new Date(Math.max(next, t + DAY)).toISOString();
}

/** 백엔드 shouldEscalate와 같은 규칙: 연속 무변화 2번 이상이고 사유별 기한이 지났거나, 8번 연속 무변화 */
export function shouldEscalate(c: Subject, f: { unchanged: number; since: string }, now: Date = new Date()): boolean {
  const reason = followUpReasonOf(c.status, c.period, now, c.contentTba);
  if (!reason || f.unchanged < ESCALATE.minChecks) return false;
  if (f.unchanged >= ESCALATE.maxChecks) return true;
  const p = c.period;
  const daysSince = (ms: number) => (now.getTime() - ms) / DAY;
  switch (reason) {
    case 'start_tba':
      return p.expectedStart ? daysSince(expectedWindowEnd(p.expectedStart)) >= ESCALATE.expectedGraceDays : daysSince(Date.parse(f.since)) >= ESCALATE.startTbaDays;
    case 'month_only':
      return false;
    case 'content_tba':
      return !!p.start && daysSince(dayMs(p.start)) >= ESCALATE.contentStartedDays;
    default:
      return !!p.start && daysSince(dayMs(p.start)) >= ESCALATE.runningDays;
  }
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
  if (period.endKind === 'conditional' && computePhase(period, now) === 'ended') return null;
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
    // 재고 소진 등은 날짜가 발표될 일이 없어 다시 확인하지 않는다
    if (period.endKind === 'conditional' && period.endCondition === 'tied_event') return 'end_tied';
  }
  if (contentTba) return 'content_tba';
  return null;
}

/** 관리자 화면(한국어 고정)의 기간 문구 */
export const ADMIN_PERIOD_LABELS = {
  unknown: '시기 미상',
  permanent: '상시',
  tba: '종료일 미발표',
  conditional: { sold_out: '재고 소진 시 종료', tied_event: '다른 일정에 따라 종료', other: '조건부 종료' },
};

/** 관리자 화면(한국어 고정)의 기간 표기 */
export function adminPeriodLabel(period: Period): string {
  const label = formatPeriod(period, ADMIN_PERIOD_LABELS);
  if (period.start || !period.expectedStart) return label;
  const [y, m, d] = period.expectedStart.split('-');
  return `${label} (예상 ${y}.${m}${d ? `.${d}` : ''}~)`;
}
