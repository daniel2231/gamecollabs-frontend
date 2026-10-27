import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { OG_SIZE, ogCard } from '@/lib/og-card';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'GameCollabs';

export default async function OgImage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  const [stats, t, tSite] = await Promise.all([
    api.getStats({ locale }),
    getTranslations({ locale, namespace: 'Stats' }),
    getTranslations({ locale, namespace: 'Site' }),
  ]);
  const years = stats.years.filter((y) => y.count > 0).map((y) => y.year);
  const range = years.length ? [...new Set([years[0], years.at(-1)])].join('–') : '';
  const subtitle = range ? t('ogSubtitle', { count: stats.published, range }) : tSite('collabCount', { count: stats.published });
  return ogCard({ siteName: tSite('name'), title: t('title'), subtitle });
}
