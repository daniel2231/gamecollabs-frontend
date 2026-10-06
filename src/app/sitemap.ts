import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { api } from '@/lib/api';
import { siteUrl } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const data = await api.getSitemap();
  const entry = (path: string, lastModified?: string): MetadataRoute.Sitemap[number] => ({
    url: `${base}/ko${path}`,
    lastModified,
    alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}${path}`])) },
  });
  return [
    entry(''),
    ...data.collabs.map((c) => entry(`/collabs/${c.slug}`, c.updatedAt)),
    ...data.properties.map((p) => entry(`/properties/${p.slug}`)),
    ...data.companies.map((c) => entry(`/companies/${c.slug}`)),
  ];
}
