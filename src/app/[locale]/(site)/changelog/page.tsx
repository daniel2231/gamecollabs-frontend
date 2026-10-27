import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Markdown } from '@/components/site/Markdown';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { CHANGELOG_PATH as PATH, versionAnchor } from '@/lib/changelog';
import { formatDate } from '@/lib/format';
import { alternatesFor, openGraphFor } from '@/lib/seo';

export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps<'/[locale]/changelog'>): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const [t, tSite] = await Promise.all([getTranslations({ locale, namespace: 'Changelog' }), getTranslations({ locale, namespace: 'Site' })]);
  return {
    title: t('title'),
    description: t('description'),
    alternates: alternatesFor(locale, PATH),
    openGraph: openGraphFor({ locale, path: PATH, siteName: tSite('name'), title: t('title'), description: t('description') }),
  };
}

/** 사이트 변경 내역: 관리자가 쓴 릴리스 노트(버전·날짜·마크다운 본문), 최신순 */
export default async function ChangelogPage({ params }: PageProps<'/[locale]/changelog'>) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [t, entries] = await Promise.all([getTranslations('Changelog'), api.listChangelog(locale)]);
  return (
    <>
      <header className="ct-hero">
        <div>
          <h1>{t('title')}</h1>
          <p className="ct-stats-lead">{t('description')}</p>
        </div>
      </header>
      {entries.length === 0 ? (
        <p className="ct-changelog-empty">{t('empty')}</p>
      ) : (
        <ol className="ct-changelog">
          {entries.map((e) => {
            const anchor = versionAnchor(e.version);
            return (
              <li key={e.id} id={anchor} className="ct-changelog-entry">
                <div className="ct-changelog-meta">
                  <h2 className="ct-mono">
                    <a href={`#${anchor}`}>{e.version}</a>
                  </h2>
                  <time dateTime={e.date} className="ct-mono">
                    {formatDate(e.date, 'day')}
                  </time>
                </div>
                <Markdown>{e.body}</Markdown>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
