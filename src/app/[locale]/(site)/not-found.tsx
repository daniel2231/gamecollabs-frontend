import { Button, Flex, Heading, Text } from '@radix-ui/themes';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('NotFound');
  return (
    <Flex direction="column" align="start" gap="3" py="9">
      <Heading as="h1" size="7">
        {t('title')}
      </Heading>
      <Text color="gray">{t('body')}</Text>
      <Button asChild mt="2">
        <Link href="/">{t('home')}</Link>
      </Button>
    </Flex>
  );
}
