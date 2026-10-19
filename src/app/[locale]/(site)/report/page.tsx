import { Flex, Heading, Text } from '@radix-ui/themes';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ReportForm } from '@/components/report/ReportForm';
import type { Locale } from '@/i18n/routing';
import { alternatesFor } from '@/lib/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]/report'>): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: 'Report' });
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
    alternates: alternatesFor(locale, '/report'),
    // 폼만 있는 페이지라 검색 결과에 올리지 않는다
    robots: { index: false, follow: true },
  };
}

/** F-15: 아직 목록에 없는 콜라보 제보. 운영자가 출처를 확인한 뒤 등록한다 */
export default async function ReportPage({ params }: PageProps<'/[locale]/report'>) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations('Report');
  return (
    <div className="ct-article">
      <Flex direction="column" gap="5">
        <Flex direction="column" gap="2">
          <Heading as="h1" size="8" weight="bold" style={{ letterSpacing: '-0.03em' }}>
            {t('pageTitle')}
          </Heading>
          <Text as="p" color="gray" m="0">
            {t('pageDescription')}
          </Text>
        </Flex>
        <ReportForm kind="tip" />
      </Flex>
    </div>
  );
}
