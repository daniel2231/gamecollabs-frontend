/**
 * zod 없이 쓰는 상수. 클라이언트 컴포넌트가 '@/schema'를 값으로 불러오면 zod 전체가 브라우저 번들에 들어가므로,
 * 클라이언트에서 필요한 목록은 여기 두고 '@/schema'는 이 파일을 다시 내보낸다.
 */
export const TAXONOMIES = ['category', 'partner_category', 'region', 'platform', 'collab_type'] as const;
export const PHASES = ['upcoming', 'ongoing', 'ended', 'unknown'] as const;
export type Phase = (typeof PHASES)[number];
/**
 * current(기본값): 진행 중(최근 시작순) → 예정(가까운 순) → 종료(최근 종료순) → 시기 미상.
 * 먼 미래 콜라보가 목록 맨 위를 차지하지 않도록 '지금' 기준으로 늘어놓는다
 */
export const SORTS = ['current', 'start_desc', 'start_asc', 'recent'] as const;
export type Sort = (typeof SORTS)[number];
export const FACET_PARAMS = ['category', 'partner_category', 'region', 'platform', 'collab_type'] as const;
export type FacetParam = (typeof FACET_PARAMS)[number];
