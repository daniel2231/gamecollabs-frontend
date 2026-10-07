import { Badge } from '@radix-ui/themes';
import { useTranslations } from 'next-intl';

/** 영문이 기계 번역일 때 표시 */
export function TranslationBadge() {
  const t = useTranslations('Translation');
  return (
    <Badge color="cyan" variant="soft" size="1">
      {t('machine')}
    </Badge>
  );
}
