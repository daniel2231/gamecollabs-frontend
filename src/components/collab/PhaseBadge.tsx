import { Badge } from '@radix-ui/themes';
import { useTranslations } from 'next-intl';
import type { Phase } from '@/schema';

const COLORS = { ongoing: 'grass', upcoming: 'amber', ended: 'gray', unknown: 'gray' } as const;

/** 모든 상태가 같은 모양(soft 배지 + 점). 상태 미상은 속이 빈 점으로 '종료'와 구분한다 */
export function PhaseBadge({ phase, size = '1' }: { phase: Phase; size?: '1' | '2' }) {
  const t = useTranslations('Phase');
  const unknown = phase === 'unknown';
  return (
    <Badge size={size} color={COLORS[phase]} variant="soft" highContrast={phase === 'ongoing'}>
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          flex: 'none',
          background: unknown ? 'transparent' : 'currentColor',
          boxShadow: unknown ? 'inset 0 0 0 1.5px currentColor' : undefined,
        }}
      />
      {t(phase)}
    </Badge>
  );
}
