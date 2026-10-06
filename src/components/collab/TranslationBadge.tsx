import { Badge, Tooltip } from '@radix-ui/themes';
import { useTranslations } from 'next-intl';

/** en 페이지에서 영문이 없어 한국어를 대신 보여줄 때 / 기계 번역일 때 */
export function TranslationBadge({ kind }: { kind: 'fallback' | 'machine' }) {
  const t = useTranslations('Translation');
  return (
    <Tooltip content={t(kind)}>
      <Badge color={kind === 'fallback' ? 'orange' : 'cyan'} variant="soft" size="1" lang="ko">
        {t(kind)}
      </Badge>
    </Tooltip>
  );
}
