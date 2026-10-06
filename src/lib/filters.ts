import {
  collabQuerySchema,
  FACET_PARAMS,
  PHASES,
  SORTS,
  type CollabQuery,
  type FacetParam,
  type Phase,
  type Sort,
} from '@/schema';

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

/** 다중 값은 쉼표 구분(?region=region.japan,region.korea) 또는 반복 파라미터 둘 다 허용 */
function readList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : [value];
  return [...new Set(raw.flatMap((v) => v.split(',')).map((v) => v.trim()).filter(Boolean))];
}

function readOne(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v === undefined || v === '' ? undefined : v;
}

/** URL 쿼리 → 검증된 목록 쿼리. 잘못된 값은 버린다(공유 링크가 깨지지 않도록). */
export function parseCollabQuery(params: SearchParamsRecord): CollabQuery {
  const phase = readOne(params.phase);
  const sort = readOne(params.sort);
  const month = (v: string | undefined) => (v && /^\d{4}-\d{2}$/.test(v) ? v : undefined);
  const limit = Number(readOne(params.limit));
  return collabQuerySchema.parse({
    q: readOne(params.q)?.slice(0, 100),
    ...Object.fromEntries(FACET_PARAMS.map((f) => [f, readList(params[f])])),
    phase: PHASES.includes(phase as Phase) ? phase : undefined,
    from: month(readOne(params.from)),
    to: month(readOne(params.to)),
    sort: SORTS.includes(sort as Sort) ? sort : undefined,
    limit: Number.isInteger(limit) && limit >= 1 ? Math.min(limit, 100) : undefined,
  });
}

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

export function toggleFacet(query: CollabQuery, facet: FacetParam, key: string): CollabQuery {
  const list = query[facet];
  const next = list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
  return { ...query, [facet]: next, limit: 20 };
}

export function hasActiveFilters(query: CollabQuery): boolean {
  return Boolean(
    query.q || query.phase || query.from || query.to || FACET_PARAMS.some((f) => query[f].length > 0),
  );
}
