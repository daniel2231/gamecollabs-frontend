import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { JsonLd } from '@/components/site/JsonLd';
import { StatsBreakdown } from '@/components/stats/StatsBreakdown';
import { ColumnChart, KpiRow, MethodNote, StatsSection, YearTabs } from '@/components/stats/StatsParts';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { statsDatasetJsonLd } from '@/lib/jsonld';
import { alternatesFor, openGraphFor } from '@/lib/seo';
import { siteUrl } from '@/lib/site';
import { STATS_PATH as PATH, collectionStartLabel, monthColumns, recentMonths } from '@/lib/stats';

export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps<'/[locale]/stats'>): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const [t, tSite, stats] = await Promise.all([
    getTranslations({ locale, namespace: 'Stats' }),
    getTranslations({ locale, namespace: 'Site' }),
    api.getStats({ locale }),
  ]);
  const description = t('metaDescription', { count: stats.published });
  return {
    title: t('title'),
    description,
    alternates: alternatesFor(locale, PATH),
    openGraph: openGraphFor({ locale, path: PATH, siteName: tSite('name'), title: t('title'), description }),
  };
}

export default async function StatsPage({ params }: PageProps<'/[locale]/stats'>) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [t, tPhase, tSite, stats] = await Promise.all([
    getTranslations('Stats'),
    getTranslations('Phase'),
    getTranslations('Site'),
    api.getStats({ locale }),
  ]);
  const now = new Date();
  const thisYear = now.getUTCFullYear();
  const base = siteUrl();
  const years = stats.years.filter((y) => y.count > 0);
  const since = t('section.monthlySince', { month: collectionStartLabel(locale) });

  return (
    <>
      <JsonLd
        data={statsDatasetJsonLd({
          name: t('dataset.name'),
          description: t('metaDescription', { count: stats.published }),
          url: `${base}/${locale}${PATH}`,
          locale,
          publisher: { name: tSite('name'), url: `${base}/${locale}` },
          years: years.map((y) => y.year),
          measured: t.raw('dataset.measured') as string[],
        })}
      />
      <header className="ct-hero">
        <div>
          <h1>{t('title')}</h1>
          <p className="ct-stats-lead">{t('lead', { count: stats.published })}</p>
        </div>
      </header>

      <YearTabs label={t('years.label')} allLabel={t('years.all')} years={years} current={null} />

      {stats.published === 0 ? (
        <p className="ct-stats-empty">{t('empty')}</p>
      ) : (
        <div className="ct-stats">
          <KpiRow
            label={t('kpi.label')}
            items={[
              { label: t('kpi.total'), value: String(stats.published) },
              { label: tPhase('ongoing'), value: String(stats.byPhase.ongoing), accent: true },
              { label: tPhase('upcoming'), value: String(stats.byPhase.upcoming) },
              { label: tPhase('ended'), value: String(stats.byPhase.ended) },
              { label: t('kpi.yearTotal', { year: thisYear }), value: String(years.find((y) => y.year === thisYear)?.count ?? 0) },
            ]}
          />

          <StatsSection id="monthly" title={t('section.monthly')} note={since}>
            <ColumnChart
              label={`${t('section.monthly')} · ${since}`}
              columns={monthColumns(recentMonths(stats.monthly, now), locale)}
              caption={[t('method.collectionStart'), stats.undated > 0 ? t('chart.undated', { count: stats.undated }) : null].filter(Boolean).join(' ')}
            />
          </StatsSection>

          <StatsBreakdown stats={stats} year={null} />
        </div>
      )}

      <MethodNote undated={stats.undated} yearScoped={false} />
    </>
  );
}
