import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { AccountMenu } from '@/components/member/AccountMenu';
import { Link } from '@/i18n/navigation';
import { LIST_PATH } from '@/lib/list-url';
import { STATS_PATH } from '@/lib/stats';
import { HeaderNav } from './HeaderNav';
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
            <HeaderNav
              label={t('nav.main')}
              items={[
                { href: LIST_PATH, label: t('nav.collabs') },
                { href: STATS_PATH, label: t('nav.stats') },
              ]}
            />
            <Suspense fallback={<LanguageMenuFallback />}>
              <LanguageMenu />
            </Suspense>
            <AccountMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
