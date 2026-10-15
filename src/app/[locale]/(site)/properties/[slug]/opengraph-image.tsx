import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { OG_SIZE, ogCard } from '@/lib/og-card';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'GameCollabs';

export default async function OgImage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const p = await api.getProperty(slug, locale as Locale);
  const tSite = await getTranslations({ locale: locale as Locale, namespace: 'Site' });
  const subtitle = p ? `${p.kind.label} · ${tSite('collabCount', { count: p.stats.collabCount })}` : '';
  return ogCard({ siteName: tSite('name'), title: p?.name.value ?? tSite('name'), subtitle });
}
