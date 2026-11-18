import { useTranslations } from 'next-intl';
import { formatPeriod, periodLabels } from '@/lib/format';
import type { Period } from '@/schema';

export function usePeriodLabel() {
  const t = useTranslations('Period');
  return (period: Period) => formatPeriod(period, periodLabels(t));
}

export function PeriodText({ period }: { period: Period }) {
  const label = usePeriodLabel();
  return <span className="ct-mono">{label(period)}</span>;
}
