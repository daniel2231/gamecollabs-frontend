import { SiteFooter } from '@/components/site/SiteChrome';
import { SiteHeader } from '@/components/site/SiteHeader';
import NotFoundContent from './(site)/not-found';

export default function LocaleNotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="ct-container" style={{ minHeight: '60vh' }}>
        <NotFoundContent />
      </main>
      <SiteFooter />
    </>
  );
}
