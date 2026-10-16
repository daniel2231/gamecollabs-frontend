import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { Link } from '@/i18n/navigation';
import { LIST_PATH } from '@/lib/filters';
import { LanguageMenu } from './LanguageMenu';
import { LogoMark } from './LogoMark';
import { SearchBox } from './SearchBox';

export async function SiteHeader() {
  const t = await getTranslations('Site');
  return (
    <header className="ct-header">
      <div className="ct-container">
        <div className="ct-header-row">
          <Link href="/" className="ct-logo">
            <LogoMark />
            {t('name')}
          </Link>
          <div className="ct-header-search">
            <Suspense fallback={null}>
              <SearchBox />
            </Suspense>
          </div>
          <div className="ct-header-end">
            <nav aria-label={t('nav.main')}>
              <Link href={LIST_PATH} className="ct-header-nav">
                {t('nav.collabs')}
              </Link>
            </nav>
            <Suspense fallback={null}>
              <LanguageMenu />
            </Suspense>
          </div>
        </div>
      </div>
    </header>
  );
}
