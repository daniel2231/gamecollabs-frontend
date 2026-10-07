import { Callout, Flex, Link as RadixLink, Text } from '@radix-ui/themes';
import { getLocale, getTranslations } from 'next-intl/server';
import { isMockApi } from '@/lib/api';

export async function MockBanner() {
  if (!isMockApi()) return null;
  const t = await getTranslations('Site');
  return (
    <div className="ct-container" style={{ paddingTop: 16 }}>
      <Callout.Root color="amber" size="1" variant="soft">
        <Callout.Text>{t('mockBanner')}</Callout.Text>
      </Callout.Root>
    </div>
  );
}

export async function SiteFooter() {
  const t = await getTranslations('Site');
  const locale = await getLocale();
  return (
    <footer className="ct-footer">
      <div className="ct-container">
        <Flex wrap="wrap" justify="between" gap="3" py="5">
          <Text size="2" color="gray">
            {t('footer')}
          </Text>
          <RadixLink size="2" color="gray" href={`/${locale}/rss.xml`}>
            RSS
          </RadixLink>
        </Flex>
      </div>
    </footer>
  );
}
