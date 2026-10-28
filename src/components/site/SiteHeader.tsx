import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { Link } from '@/i18n/navigation';
import { LIST_PATH } from '@/lib/list-url';
import { STATS_PATH } from '@/lib/stats';
import { LanguageMenu, LanguageMenuFallback } from './LanguageMenu';
import { LogoMark } from './LogoMark';
import { SearchBox, SearchBoxFallback } from './SearchBox';

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
            <Suspense fallback={<SearchBoxFallback />}>
              <SearchBox />
            </Suspense>
          </div>
          <div className="ct-header-end">
            <nav aria-label={t('nav.main')} className="ct-header-links">
              <Link href={LIST_PATH} className="ct-header-nav">
                {t('nav.collabs')}
              </Link>
              <Link href={STATS_PATH} className="ct-header-nav">
                {t('nav.stats')}
              </Link>
            </nav>
            <Suspense fallback={<LanguageMenuFallback />}>
              <LanguageMenu />
            </Suspense>
          </div>
        </div>
      </div>
    </header>
  );
}
