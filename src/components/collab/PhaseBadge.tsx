import { useTranslations } from 'next-intl';
import type { Phase } from '@/schema';

/** 작은 사각형 + 글자. 진행 중만 강조색, 예정·미상은 속이 빈 사각형(globals.css의 .ct-phase) */
export function PhaseBadge({ phase, size = '1' }: { phase: Phase; size?: '1' | '2' }) {
  const t = useTranslations('Phase');
  return (
    <span className="ct-phase" data-phase={phase} data-size={size}>
      {t(phase)}
    </span>
  );
}
