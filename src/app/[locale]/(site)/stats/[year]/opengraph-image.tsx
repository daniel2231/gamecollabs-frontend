import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { OG_SIZE, ogCard } from '@/lib/og-card';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'GameCollabs';

export default async function OgImage({ params }: { params: Promise<{ locale: string; year: string }> }) {
  const { locale: rawLocale, year: rawYear } = await params;
  const locale = rawLocale as Locale;
  const year = /^\d{4}$/.test(rawYear) ? Number(rawYear) : null;
  const [stats, t, tSite] = await Promise.all([
    year ? api.getStats({ locale, year }) : null,
    getTranslations({ locale, namespace: 'Stats' }),
    getTranslations({ locale, namespace: 'Site' }),
  ]);
  return ogCard({
    siteName: tSite('name'),
    title: year ? t('yearTitle', { year }) : t('title'),
    subtitle: stats ? tSite('collabCount', { count: stats.published }) : '',
  });
}
