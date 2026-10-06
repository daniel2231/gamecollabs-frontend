import { Badge } from '@radix-ui/themes';
import { useTranslations } from 'next-intl';
import type { Phase } from '@/schema';

const COLORS = { ongoing: 'grass', upcoming: 'amber', ended: 'gray', unknown: 'gray' } as const;

export function PhaseBadge({ phase, size = '1' }: { phase: Phase; size?: '1' | '2' }) {
  const t = useTranslations('Phase');
  if (phase === 'unknown') {
    return (
      <Badge size={size} color="gray" variant="outline" style={{ borderStyle: 'dashed' }}>
        {t('unknown')}
      </Badge>
    );
  }
  return (
    <Badge size={size} color={COLORS[phase]} variant="soft" highContrast={phase === 'ongoing'}>
      {phase === 'ongoing' && (
        <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor' }} />
      )}
      {t(phase)}
    </Badge>
  );
}
