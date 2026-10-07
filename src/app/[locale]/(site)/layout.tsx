import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MockBanner, SiteFooter } from '@/components/site/SiteChrome';
import { SiteHeader } from '@/components/site/SiteHeader';

export default async function SiteLayout({ children, params }: LayoutProps<'/[locale]'>) {
  setRequestLocale((await params).locale);
  const t = await getTranslations('Site');
  return (
    <>
      <a href="#main" className="ct-skip">
        {t('skip')}
      </a>
      <SiteHeader />
      <MockBanner />
      <main id="main" className="ct-container" style={{ paddingTop: 32, paddingBottom: 64, minHeight: '60vh' }}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
