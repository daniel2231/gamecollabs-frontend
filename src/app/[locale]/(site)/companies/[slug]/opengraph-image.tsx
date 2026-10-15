import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { OG_SIZE, ogCard } from '@/lib/og-card';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'GameCollabs';

export default async function OgImage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const c = await api.getCompany(slug, locale as Locale);
  const tSite = await getTranslations({ locale: locale as Locale, namespace: 'Site' });
  const country = c?.country ? new Intl.DisplayNames([locale], { type: 'region' }).of(c.country) : null;
  const subtitle = c ? [country, tSite('collabCount', { count: c.stats.collabCount })].filter(Boolean).join(' · ') : '';
  return ogCard({ siteName: tSite('name'), title: c?.name.value ?? tSite('name'), subtitle });
}
