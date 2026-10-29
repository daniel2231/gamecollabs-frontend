import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { IpTile } from '@/components/property/IpTile';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { PROPERTIES_PATH as PATH } from '@/lib/featured';
import { alternatesFor, openGraphFor } from '@/lib/seo';

export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps<'/[locale]/properties'>): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const [t, tSite] = await Promise.all([getTranslations({ locale, namespace: 'Properties' }), getTranslations({ locale, namespace: 'Site' })]);
  return {
    title: t('title'),
    description: t('description'),
    alternates: alternatesFor(locale, PATH),
    openGraph: openGraphFor({ locale, path: PATH, siteName: tSite('name'), title: t('title'), description: t('description') }),
  };
}

/** IP로 찾아보기 전체: 운영자가 홈 노출로 고른 작품 가운데 발행된 콜라보가 있는 것을 노출 순서대로 */
export default async function PropertiesPage({ params }: PageProps<'/[locale]/properties'>) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [t, tHome, featured] = await Promise.all([getTranslations('Properties'), getTranslations('Home'), api.listFeaturedProperties(locale)]);
  const ips = featured.filter((p) => p.collabCount > 0);
  return (
    <>
      <header className="ct-hero">
        <div>
          <h1>{t('title')}</h1>
          <p className="ct-stats-lead">{t('description')}</p>
        </div>
      </header>
      {ips.length === 0 ? (
        <p className="ct-changelog-empty">{t('empty')}</p>
      ) : (
        <ul className="ct-ip-grid ct-ip-grid-page">
          {ips.map((p) => (
            <li key={p.slug}>
              <IpTile property={p} collabs={tHome('ipCollabs', { count: p.collabCount })} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
