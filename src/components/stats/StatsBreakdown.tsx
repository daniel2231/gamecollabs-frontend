import { getTranslations } from 'next-intl/server';
import { BarList, RankList, StatsSection } from '@/components/stats/StatsParts';
import { listHref } from '@/lib/filters';
import { STATS_COMPANY_ROLES, type FacetParam, type Stats } from '@/schema';

/** 통계 필드 → 목록 필터 이름. 파트너 분류를 맨 앞에 둔다(가장 많이 찾는 질문: 어떤 IP와 하나) */
const DISTRIBUTIONS = [
  ['partnerCategory', 'partner_category'],
  ['collabType', 'collab_type'],
  ['category', 'category'],
  ['region', 'region'],
  ['platform', 'platform'],
] as const satisfies readonly (readonly [keyof Stats, FacetParam])[];

/**
 * 분류별 분포와 순위. 통계 홈과 연도 리포트가 함께 쓴다.
 * year가 있으면 분류 링크를 그해 기간(1~12월)으로 좁힌 목록으로 보낸다.
 */
export async function StatsBreakdown({ stats, year }: { stats: Stats; year: number | null }) {
  const [t, tList] = await Promise.all([getTranslations('Stats'), getTranslations('List')]);
  const period = year ? { from: `${year}-01`, to: `${year}-12` } : {};
  const companyRankings = STATS_COMPANY_ROLES.map((role) => ({ role, items: stats.topCompanies[role] ?? [] })).filter((r) => r.items.length > 0);

  return (
    <>
      <StatsSection id="distribution" title={t('section.distribution')}>
        <div className="ct-stats-grid">
          {DISTRIBUTIONS.map(([field, param]) => (
            <BarList
              key={field}
              title={tList(`facet.${param}`)}
              items={stats[field]}
              total={stats.published}
              href={(key) => listHref({ [param]: [key], ...period })}
            />
          ))}
        </div>
      </StatsSection>

      <StatsSection id="ranking" title={t('section.ranking')}>
        <div className="ct-stats-grid">
          <RankList title={t('section.topHosts')} items={stats.topHosts} hrefPrefix="/properties" />
          <RankList title={t('section.topPartners')} items={stats.topPartners} hrefPrefix="/properties" />
          {companyRankings.map(({ role, items }) => (
            <RankList key={role} title={t(`rank.role.${role}`)} items={items} hrefPrefix="/companies" />
          ))}
        </div>
      </StatsSection>
    </>
  );
}
