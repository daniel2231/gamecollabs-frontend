import { Flex, Link as RadixLink, Text } from '@radix-ui/themes';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { isMockApi } from '@/lib/api';

export async function MockBanner() {
  if (!isMockApi()) return null;
  const t = await getTranslations('Site');
  return (
    <div className="ct-container" style={{ paddingTop: 12 }}>
      <Text as="p" size="1" color="gray" m="0" className="ct-mono">
        {t('mockBanner')}
      </Text>
    </div>
  );
}

export async function SiteFooter() {
  const locale = await getLocale();
  const t = await getTranslations('Site');
  return (
    <footer className="ct-footer">
      <div className="ct-container">
        <Flex wrap="wrap" justify="between" align="baseline" gap="3" py="5">
          <Text size="2" color="gray">
            {t('name')}
          </Text>
          <Flex gap="4" align="baseline">
            <RadixLink asChild size="2" color="gray">
              <Link href="/report">{t('report')}</Link>
            </RadixLink>
            <RadixLink size="2" color="gray" href={`/${locale}/rss.xml`} className="ct-mono">
              RSS
            </RadixLink>
          </Flex>
        </Flex>
      </div>
    </footer>
  );
}
