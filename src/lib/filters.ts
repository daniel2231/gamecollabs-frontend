import { normalizeTerm } from './taxonomy';
import {
  collabQuerySchema,
  type CollabSummary,
  FACET_PARAMS,
  PHASES,
  SORTS,
  type CollabQuery,
  type Phase,
  type Sort,
} from '@/schema';

// 주소를 만드는 함수는 클라이언트 컴포넌트도 쓰므로 zod 없는 파일에 두고 여기서 다시 내보낸다
export { EMPTY_FILTERS, hasFilterPanelValues, LIST_PATH, listHref, serializeCollabQuery, toggleFacet } from './list-url';

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
  // 작품·회사 슬러그. 경로 구분자나 공백이 든 값은 버린다
  const slug = (v: string | undefined) => (v && /^[^\s/?#]{1,100}$/.test(v) ? v : undefined);
  return collabQuerySchema.parse({
    q: readOne(params.q)?.slice(0, 100),
    ...Object.fromEntries(FACET_PARAMS.map((f) => [f, readList(params[f])])),
    property: slug(readOne(params.property)),
    company: slug(readOne(params.company)),
    phase: PHASES.includes(phase as Phase) ? phase : undefined,
    from: month(readOne(params.from)),
    to: month(readOne(params.to)),
    sort: SORTS.includes(sort as Sort) ? sort : undefined,
    limit: Number.isInteger(limit) && limit >= 1 ? Math.min(limit, 100) : undefined,
  });
}

export function hasActiveFilters(query: CollabQuery): boolean {
  return Boolean(
    query.q || query.phase || query.from || query.to || query.property || query.company || FACET_PARAMS.some((f) => query[f].length > 0),
  );
}

/** 검색 결과에서 작품으로 좁히기 제안 수 */
export const ENTITY_SUGGESTIONS = 5;

export type EntitySuggestion = { slug: string; name: string; kind: string };

/**
 * 검색어와 이름이 맞는 참여 작품(게임·IP)을 결과에서 골라 필터로 고정할 후보로 낸다.
 * 이름에 검색어가 들어 있거나("원신" ⊂ "원신"), 검색어에 이름이 들어 있으면("원신 한국" ⊃ "원신") 맞는다.
 * 결과에 많이 나온 작품이 앞에 온다(같으면 먼저 나온 순)
 */
export function entitySuggestions(items: CollabSummary[], q: string | undefined, limit = ENTITY_SUGGESTIONS): EntitySuggestion[] {
  const query = q ? normalizeTerm(q) : '';
  if (!query) return [];
  const found = new Map<string, EntitySuggestion & { hits: number }>();
  for (const party of items.flatMap((c) => c.parties)) {
    const names = [party.name.value, party.name.original].filter((n): n is string => Boolean(n)).map(normalizeTerm);
    if (!names.some((n) => n.includes(query) || (n.length >= 2 && query.includes(n)))) continue;
    const prev = found.get(party.slug);
    if (prev) prev.hits += 1;
    else found.set(party.slug, { slug: party.slug, name: party.name.value, kind: party.kind.label, hits: 1 });
  }
  return [...found.values()]
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map(({ hits: _, ...rest }) => rest);
}
