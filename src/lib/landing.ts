/**
 * 필터 랜딩 페이지: 필터를 정확히 하나만 건 목록(진행 상태 하나, 또는 분류 항목 하나)은 색인한다.
 * 검색어·기간·여러 필터 조합은 지금처럼 noindex. 정렬·더 보기(sort·limit)는 무시하고 canonical에서 뺀다.
 */
import { FACET_PARAMS, type CollabQuery, type FacetParam, type Phase } from '@/schema';
import { serializeCollabQuery } from './filters';

export type Landing = { param: 'phase'; key: Exclude<Phase, 'unknown'> } | { param: FacetParam; key: string };

/** 색인할 진행 상태. unknown은 목록 탭에도 없으므로 제외 */
export const LANDING_PHASES = ['ongoing', 'upcoming', 'ended'] as const;

export function landingOf(query: CollabQuery): Landing | null {
  if (query.q || query.from || query.to) return null;
  const facets = FACET_PARAMS.filter((f) => query[f].length > 0);
  if (query.phase) {
    if (facets.length > 0 || query.phase === 'unknown') return null;
    return { param: 'phase', key: query.phase };
  }
  const [facet] = facets;
  if (facets.length !== 1 || !facet || query[facet].length !== 1) return null;
  return { param: facet, key: query[facet][0]! };
}

/** canonical에 쓰는 경로(언어 접두어 뒤). 예: `?category=category.in_game` */
export function landingPath(landing: Landing): string {
  return serializeCollabQuery(landing.param === 'phase' ? { phase: landing.key } : { [landing.param]: [landing.key] });
}
