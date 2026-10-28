import { FACET_PARAMS } from '@/schema/constants';
import type { CollabQuery, FacetParam } from '@/schema';

/** 콜라보 목록 경로(언어 접두어 뒤). 홈(`/`)은 요약 화면이다 */
export const LIST_PATH = '/collabs';

/** 목록 쿼리 → URL 쿼리 문자열(기본값은 생략해 짧게) */
export function serializeCollabQuery(query: Partial<CollabQuery>): string {
  const sp = new URLSearchParams();
  if (query.q) sp.set('q', query.q);
  for (const f of FACET_PARAMS) {
    const list = query[f];
    if (list && list.length) sp.set(f, [...list].sort().join(','));
  }
  if (query.phase) sp.set('phase', query.phase);
  if (query.from) sp.set('from', query.from);
  if (query.to) sp.set('to', query.to);
  if (query.sort && query.sort !== 'start_desc') sp.set('sort', query.sort);
  if (query.limit && query.limit !== 20) sp.set('limit', String(query.limit));
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** 목록 쿼리 → 목록 주소(언어 접두어 뒤). 예: `/collabs?phase=ongoing` */
export function listHref(query: Partial<CollabQuery>): string {
  return `${LIST_PATH}${serializeCollabQuery(query)}`;
}

export function toggleFacet(query: CollabQuery, facet: FacetParam, key: string): CollabQuery {
  const list = query[facet];
  const next = list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
  return { ...query, [facet]: next, limit: 20 };
}
