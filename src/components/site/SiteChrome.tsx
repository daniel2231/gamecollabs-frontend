import { Callout, Flex, Link as RadixLink } from '@radix-ui/themes';
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
  const locale = await getLocale();
  return (
    <footer className="ct-footer">
      <div className="ct-container">
        <Flex wrap="wrap" justify="end" gap="3" py="5">
          <RadixLink size="2" color="gray" href={`/${locale}/rss.xml`}>
            RSS
          </RadixLink>
        </Flex>
      </div>
    </footer>
  );
}
