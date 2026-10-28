import {
  collabQuerySchema,
  FACET_PARAMS,
  PHASES,
  SORTS,
  type CollabQuery,
  type Phase,
  type Sort,
} from '@/schema';

// 주소를 만드는 함수는 클라이언트 컴포넌트도 쓰므로 zod 없는 파일에 두고 여기서 다시 내보낸다
export { LIST_PATH, listHref, serializeCollabQuery, toggleFacet } from './list-url';

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

export function hasActiveFilters(query: CollabQuery): boolean {
  return Boolean(
    query.q || query.phase || query.from || query.to || FACET_PARAMS.some((f) => query[f].length > 0),
  );
}
