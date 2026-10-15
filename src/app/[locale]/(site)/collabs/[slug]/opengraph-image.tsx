import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { formatPeriod } from '@/lib/format';
import { OG_SIZE, ogCard } from '@/lib/og-card';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'GameCollabs';

export default async function OgImage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const collab = await api.getCollab(slug, locale as Locale);
  const [tSite, tPeriod] = await Promise.all([
    getTranslations({ locale: locale as Locale, namespace: 'Site' }),
    getTranslations({ locale: locale as Locale, namespace: 'Period' }),
  ]);
  const period = collab ? formatPeriod(collab.period, { unknown: tPeriod('unknown'), permanent: tPeriod('permanent'), tba: tPeriod('tba') }) : '';
  return ogCard({ siteName: tSite('name'), title: collab?.title ?? tSite('name'), subtitle: period });
}
