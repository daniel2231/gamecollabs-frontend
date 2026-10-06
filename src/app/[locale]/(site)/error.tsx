'use client';

import { Button, Flex, Heading } from '@radix-ui/themes';
import { useTranslations } from 'next-intl';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('Error');
  return (
    <Flex direction="column" align="start" gap="3" py="9">
      <Heading as="h1" size="6">
        {t('title')}
      </Heading>
      <Button onClick={reset}>{t('retry')}</Button>
    </Flex>
  );
}
