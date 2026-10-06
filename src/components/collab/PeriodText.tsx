import { useTranslations } from 'next-intl';
import { formatPeriod } from '@/lib/format';
import type { Period } from '@/schema';

export function usePeriodLabel() {
  const t = useTranslations('Period');
  return (period: Period) => formatPeriod(period, { unknown: t('unknown'), permanent: t('permanent'), tba: t('tba') });
}

export function PeriodText({ period }: { period: Period }) {
  const label = usePeriodLabel();
  return <span className="ct-mono">{label(period)}</span>;
}
