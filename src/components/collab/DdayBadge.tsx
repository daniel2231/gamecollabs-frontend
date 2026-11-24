'use client';

import { VisuallyHidden } from '@radix-ui/themes';
import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';
import { DDAY_URGENT, daysLeft, localToday } from '@/lib/dday';
import type { Period } from '@/schema';

const noop = () => () => {};
const serverToday = () => null;

/**
 * 종료 임박 배지(D-7부터). 페이지는 캐시된 채로 며칠 나갈 수 있어 서버에서 세면 날짜가 밀린다.
 * 그래서 브라우저에서만 센다: 서버 HTML에는 없고 하이드레이션 직후 나타난다.
 * 커버 위에 겹쳐 놓이므로 나타나도 레이아웃이 밀리지 않는다.
 */
export function DdayBadge({ period }: { period: Period }) {
  const t = useTranslations('Dday');
  const today = useSyncExternalStore(noop, localToday, serverToday);
  const left = today ? daysLeft(period, today) : null;
  if (left === null) return null;
  return (
    <span className="ct-dday" data-urgent={left <= DDAY_URGENT || undefined}>
      {/* 화면 낭독기에는 "D-3" 대신 "3일 후 종료"로 읽힌다 */}
      <span aria-hidden="true">{left === 0 ? t('today') : t('label', { count: left })}</span>
      <VisuallyHidden>{t('spoken', { count: left })}</VisuallyHidden>
    </span>
  );
}
