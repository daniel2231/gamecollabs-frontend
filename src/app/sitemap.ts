import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { api } from '@/lib/api';
import { CHANGELOG_PATH } from '@/lib/changelog';
import { PROPERTIES_PATH } from '@/lib/featured';
import { LIST_PATH, parseCollabQuery } from '@/lib/filters';
import { LANDING_PHASES, landingPath, type Landing } from '@/lib/landing';
import { languageAlternates } from '@/lib/seo';
import { siteUrl } from '@/lib/site';
import { STATS_PATH, statsYears } from '@/lib/stats';
import { FACET_PARAMS, type FacetParam, type Stats } from '@/schema';

export const revalidate = 3600;

/** 결과가 있는 필터 랜딩만 넣는다. 빈 랜딩은 noindex라 sitemap에 있으면 Search Console 오류가 된다 */
async function landings(stats: Stats): Promise<Landing[]> {
  const terms = await api.getTaxonomies();
  const phases: Landing[] = LANDING_PHASES.filter((p) => stats.byPhase[p] > 0).map((key) => ({ param: 'phase', key }));
  const candidates = terms.filter((t) => !t.deprecated && (FACET_PARAMS as readonly string[]).includes(t.taxonomy));
  const counted = await Promise.all(
    candidates.map(async (t) => {
      const { total } = await api.listCollabs(parseCollabQuery({ [t.taxonomy]: t.key, limit: '1' }), routing.defaultLocale);
      return total > 0 ? ({ param: t.taxonomy as FacetParam, key: t.key } as Landing) : null;
    }),
  );
  return [...phases, ...counted.filter((l): l is Landing => l !== null)];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const stats = await api.getStats();
  const [data, landingList] = await Promise.all([api.getSitemap(), landings(stats)]);
  // 언어마다 따로 항목을 둔다. 각 항목은 자신을 포함한 같은 hreflang 묶음을 갖는다
  const entries = (path: string, lastModified?: string): MetadataRoute.Sitemap => {
    const languages = languageAlternates(path, base);
    return routing.locales.map((l) => ({ url: `${base}/${l}${path}`, lastModified, alternates: { languages } }));
  };
  return [
    ...entries(''),
    ...entries(LIST_PATH),
    ...entries(STATS_PATH),
    ...entries(CHANGELOG_PATH),
    ...entries(PROPERTIES_PATH),
    // 연도 리포트는 2026년 이후 그해 시작한 콜라보가 있을 때만 있다(없으면 404)
    ...statsYears(stats.years).flatMap((y) => entries(`${STATS_PATH}/${y.year}`)),
    ...landingList.flatMap((l) => entries(landingPath(l))),
    ...data.collabs.flatMap((c) => entries(`/collabs/${c.slug}`, c.updatedAt)),
    ...data.properties.flatMap((p) => entries(`/properties/${p.slug}`, p.updatedAt)),
    ...data.companies.flatMap((c) => entries(`/companies/${c.slug}`, c.updatedAt)),
  ];
}
