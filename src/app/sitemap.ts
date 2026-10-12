import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { api } from '@/lib/api';
import { languageAlternates } from '@/lib/seo';
import { siteUrl } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const data = await api.getSitemap();
  // 언어마다 따로 항목을 둔다. 각 항목은 자신을 포함한 같은 hreflang 묶음을 갖는다
  const entries = (path: string, lastModified?: string): MetadataRoute.Sitemap => {
    const languages = languageAlternates(path, base);
    return routing.locales.map((l) => ({ url: `${base}/${l}${path}`, lastModified, alternates: { languages } }));
  };
  return [
    ...entries(''),
    ...data.collabs.flatMap((c) => entries(`/collabs/${c.slug}`, c.updatedAt)),
    ...data.properties.flatMap((p) => entries(`/properties/${p.slug}`)),
    ...data.companies.flatMap((c) => entries(`/companies/${c.slug}`)),
  ];
}
