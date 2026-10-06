import { Flex } from '@radix-ui/themes';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { Link } from '@/i18n/navigation';
import { LanguageMenu } from './LanguageMenu';
import { SearchBox } from './SearchBox';

export async function SiteHeader() {
  const t = await getTranslations('Site');
  return (
    <header className="ct-header">
      <div className="ct-container">
        <Flex wrap="wrap" align="center" gapX="5" gapY="3" py="3">
          <Link href="/" className="ct-logo">
            <span className="ct-logo-mark" aria-hidden="true">
              ×
            </span>
            {t('name')}
          </Link>
          <Suspense fallback={<div style={{ flex: '1 1 260px' }} />}>
            <SearchBox />
          </Suspense>
          <Suspense fallback={null}>
            <LanguageMenu />
          </Suspense>
        </Flex>
      </div>
    </header>
  );
}
