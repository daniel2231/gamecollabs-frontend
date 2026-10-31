import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumb } from '@/components/site/Breadcrumb';
import { JsonLd } from '@/components/site/JsonLd';
import { StatsBreakdown } from '@/components/stats/StatsBreakdown';
import { ColumnChart, KpiRow, MethodNote, StatsSection, YearTabs } from '@/components/stats/StatsParts';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { breadcrumbJsonLd, statsDatasetJsonLd } from '@/lib/jsonld';
import { alternatesFor, openGraphFor } from '@/lib/seo';
import { siteUrl } from '@/lib/site';
import { STATS_FIRST_YEAR, STATS_PATH, monthColumns, parseStatsYear, peakMonth, yearMonths, yearOverYear } from '@/lib/stats';

type Props = PageProps<'/[locale]/stats/[year]'>;

export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

/** 주소의 연도가 네 자리이고 그해 시작한 콜라보가 있을 때만 그해 통계. 아니면 null(404) */
async function load(raw: string, locale: Locale) {
  if (!/^\d{4}$/.test(raw)) return null;
  const stats = await api.getStats({ locale, year: Number(raw) });
  const year = parseStatsYear(raw, stats.years);
  return year ? { year, stats } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, year: rawYear } = await params;
  const locale = rawLocale as Locale;
  const data = await load(rawYear, locale);
  if (!data) return {};
  const [t, tSite] = await Promise.all([
    getTranslations({ locale, namespace: 'Stats' }),
    getTranslations({ locale, namespace: 'Site' }),
  ]);
  const title = t('yearTitle', { year: data.year });
  const description = t('yearMetaDescription', { year: data.year, count: data.stats.published });
  const path = `${STATS_PATH}/${data.year}`;
  return {
    title,
    description,
    alternates: alternatesFor(locale, path),
    openGraph: openGraphFor({ locale, path, siteName: tSite('name'), title, description }),
  };
}

export default async function StatsYearPage({ params }: Props) {
  const { locale: rawLocale, year: rawYear } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const data = await load(rawYear, locale);
  if (!data) notFound();
  const { year, stats } = data;
  const [t, tPhase, tSite] = await Promise.all([getTranslations('Stats'), getTranslations('Phase'), getTranslations('Site')]);

  const now = new Date();
  const months = yearMonths(stats.monthly, year, now);
  const peak = peakMonth(months);
  const peakLabel = peak ? monthColumns([peak], locale)[0]!.label : '—';
  // 전년 기록이 아예 없거나 통계에 넣지 않는 해(2026년 전)면 비교하지 않는다
  const previous = year - 1 >= STATS_FIRST_YEAR ? (stats.years.find((y) => y.year === year - 1)?.count ?? null) : null;
  const change = yearOverYear(stats.published, previous);
  const signed = new Intl.NumberFormat(locale, { signDisplay: 'exceptZero' });
  const percent = new Intl.NumberFormat(locale, { style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 0 });
  const changeHint = !change
    ? t('kpi.noPrevious', { year: year - 1 })
    : change.ratio === null
      ? t('kpi.vsPrevious', { year: year - 1, diff: signed.format(change.diff) })
      : t('kpi.vsPreviousRatio', { year: year - 1, diff: signed.format(change.diff), ratio: percent.format(change.ratio) });

  const base = siteUrl();
  const path = `${STATS_PATH}/${year}`;
  const title = t('yearTitle', { year });

  return (
    <>
      <JsonLd
        data={[
          statsDatasetJsonLd({
            name: t('dataset.yearName', { year }),
            description: t('yearMetaDescription', { year, count: stats.published }),
            url: `${base}/${locale}${path}`,
            locale,
            publisher: { name: tSite('name'), url: `${base}/${locale}` },
            years: [year],
            measured: t.raw('dataset.measured') as string[],
          }),
          breadcrumbJsonLd([{ name: t('breadcrumb'), url: `${base}/${locale}${STATS_PATH}` }, { name: title }]),
        ]}
      />
      <header className="ct-hero">
        <div>
          <Breadcrumb label={t('breadcrumb')} items={[{ href: STATS_PATH, label: t('breadcrumb') }, { label: String(year) }]} />
          <h1>{title}</h1>
          <p className="ct-stats-lead">{t('yearLead', { year, count: stats.published })}</p>
        </div>
      </header>

      <YearTabs label={t('years.label')} allLabel={t('years.all')} years={stats.years} current={year} />

      <div className="ct-stats">
        <KpiRow
          label={t('kpi.label')}
          items={[
            { label: t('kpi.yearTotal', { year }), value: String(stats.published), hint: changeHint },
            { label: t('kpi.peak'), value: peakLabel, hint: peak ? t('chart.count', { count: peak.count }) : undefined },
            { label: tPhase('ongoing'), value: String(stats.byPhase.ongoing), accent: true },
            { label: tPhase('upcoming'), value: String(stats.byPhase.upcoming) },
            { label: tPhase('ended'), value: String(stats.byPhase.ended) },
          ]}
        />

        <StatsSection id="monthly" title={t('section.monthly')} note={t('chart.byStart')}>
          <ColumnChart label={`${title} · ${t('section.monthly')}`} columns={monthColumns(months, locale)} />
        </StatsSection>

        <StatsBreakdown stats={stats} year={year} />
      </div>

      <MethodNote undated={0} yearScoped />
    </>
  );
}
