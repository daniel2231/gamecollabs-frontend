/**
 * 공유 스키마. PRD의 packages/schema에 해당하며, 모노레포로 옮길 때 이 폴더를 그대로 이동한다.
 * API 응답(공개)과 관리자 입력 스키마를 함께 정의한다.
 */
import { z } from 'zod';

export const LOCALES = ['ko', 'en'] as const;
export const localeSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof localeSchema>;

// ── 분류(taxonomy) ─────────────────────────────────────────────

export const TAXONOMIES = ['category', 'partner_category', 'region', 'platform', 'collab_type'] as const;
export const taxonomySchema = z.enum(TAXONOMIES);
export type Taxonomy = z.infer<typeof taxonomySchema>;

/** taxonomy_terms 문서. _id가 곧 키(platform.android). */
export const taxonomyTermSchema = z.object({
  key: z.string().regex(/^[a-z_]+(\.[a-z0-9_]+)+$/),
  taxonomy: taxonomySchema,
  parent: z.string().nullable(),
  ancestors: z.array(z.string()),
  label: z.object({ ko: z.string().min(1), en: z.string().min(1) }),
  order: z.number().int(),
  deprecated: z.boolean(),
  legacyValues: z.array(z.string()),
});
export type TaxonomyTerm = z.infer<typeof taxonomyTermSchema>;

/** 응답에서 라벨이 해석된 분류 키 */
export const termRefSchema = z.object({ key: z.string(), label: z.string() });
export type TermRef = z.infer<typeof termRefSchema>;

// ── 기간·진행 상태 ─────────────────────────────────────────────

export const PRECISIONS = ['day', 'month', 'unknown'] as const;
export const END_KINDS = ['fixed', 'permanent', 'tba'] as const;
export const PHASES = ['upcoming', 'ongoing', 'ended', 'unknown'] as const;
export type Phase = (typeof PHASES)[number];

/** 날짜는 ISO 문자열(UTC 자정)로 주고받는다. */
export const periodSchema = z.object({
  start: z.iso.date().nullable(),
  end: z.iso.date().nullable(),
  precision: z.enum(PRECISIONS),
  endKind: z.enum(END_KINDS),
});
export type Period = z.infer<typeof periodSchema>;

// ── 엔티티 ─────────────────────────────────────────────────────

export const PARTY_ROLES = ['host', 'partner'] as const;
export const COMPANY_ROLES = ['publisher', 'developer', 'licensor', 'brand_partner', 'organizer'] as const;
export type CompanyRole = (typeof COMPANY_ROLES)[number];
export const SOURCE_TYPES = ['official', 'press', 'social', 'store'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];
export const COLLAB_STATUSES = ['draft', 'in_review', 'published', 'archived'] as const;
export type CollabStatus = (typeof COLLAB_STATUSES)[number];
export const ORIGIN_TYPES = ['manual', 'gpt', 'agent', 'migration'] as const;
export type OriginType = (typeof ORIGIN_TYPES)[number];

const localizedName = z.object({
  /** 요청 locale의 이름. en이 비면 ko 값이 들어오고 fallback=true */
  value: z.string(),
  fallback: z.boolean(),
  original: z.string().nullable().optional(),
});

export const partyRefSchema = z.object({
  slug: z.string(),
  role: z.enum(PARTY_ROLES),
  kind: termRefSchema,
  name: localizedName,
});
export type PartyRef = z.infer<typeof partyRefSchema>;

export const companyRefSchema = z.object({
  slug: z.string(),
  role: z.enum(COMPANY_ROLES),
  name: localizedName,
});
export type CompanyRef = z.infer<typeof companyRefSchema>;

export const sourceSchema = z.object({
  url: z.url(),
  title: z.string(),
  publisher: z.string(),
  type: z.enum(SOURCE_TYPES),
  isPrimary: z.boolean(),
  accessedAt: z.iso.date(),
  lastCheckedAt: z.iso.datetime().nullable().optional(),
  httpStatus: z.number().int().nullable().optional(),
  archiveUrl: z.url().nullable().optional(),
});
export type Source = z.infer<typeof sourceSchema>;

export const coverSchema = z.object({
  url: z.string(),
  originalUrl: z.string().nullable(),
  credit: z.string().nullable(),
  alt: z.string(),
  width: z.number().int(),
  height: z.number().int(),
});
export type Cover = z.infer<typeof coverSchema>;

// ── 공개 API 응답 ─────────────────────────────────────────────

/** GET /v1/collabs 목록 항목 */
export const collabSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  fallback: z.boolean(),
  phase: z.enum(PHASES),
  period: periodSchema,
  parties: z.array(partyRefSchema),
  category: termRefSchema.nullable(),
  regions: z.array(termRefSchema),
  platforms: z.array(termRefSchema),
  collabTypes: z.array(termRefSchema),
  cover: coverSchema.nullable(),
  publishedAt: z.iso.datetime().nullable(),
});
export type CollabSummary = z.infer<typeof collabSummarySchema>;

export const collabListResponseSchema = z.object({
  items: z.array(collabSummarySchema),
  total: z.number().int(),
  nextCursor: z.string().nullable(),
});
export type CollabListResponse = z.infer<typeof collabListResponseSchema>;

/** GET /v1/collabs/:slug */
export const collabDetailSchema = collabSummarySchema.extend({
  summary: z.string(),
  summaryFallback: z.boolean(),
  machineTranslated: z.boolean(),
  note: z.string().nullable(),
  companies: z.array(companyRefSchema),
  sources: z.array(sourceSchema),
  related: z.array(
    collabSummarySchema.extend({ relation: z.enum(['same_host', 'same_partner']) }),
  ),
  updatedAt: z.iso.datetime(),
});
export type CollabDetail = z.infer<typeof collabDetailSchema>;

const countRef = z.object({ slug: z.string(), name: z.string(), count: z.number().int() });

/** GET /v1/properties/:slug */
export const propertyDetailSchema = z.object({
  slug: z.string(),
  kind: termRefSchema,
  name: localizedName,
  nameKo: z.string(),
  nameEn: z.string().nullable(),
  aliases: z.array(z.string()),
  officialUrl: z.string().nullable(),
  parent: z.object({ slug: z.string(), name: z.string() }).nullable(),
  stats: z.object({
    collabCount: z.number().int(),
    counterpartCount: z.number().int(),
    latestStart: z.iso.date().nullable(),
  }),
  counterparts: z.array(countRef),
  typeDistribution: z.array(termRefSchema.extend({ count: z.number().int() })),
  collabs: z.array(collabSummarySchema),
});
export type PropertyDetail = z.infer<typeof propertyDetailSchema>;

/** GET /v1/companies/:slug */
export const companyDetailSchema = z.object({
  slug: z.string(),
  name: localizedName,
  nameKo: z.string(),
  nameEn: z.string().nullable(),
  aliases: z.array(z.string()),
  country: z.string().length(2).nullable(),
  stats: z.object({ collabCount: z.number().int(), latestStart: z.iso.date().nullable() }),
  roles: z.array(z.object({ role: z.enum(COMPANY_ROLES), count: z.number().int() })),
  properties: z.array(countRef),
  collabs: z.array(collabSummarySchema.extend({ companyRole: z.enum(COMPANY_ROLES) })),
});
export type CompanyDetail = z.infer<typeof companyDetailSchema>;

/** GET /v1/taxonomies */
export const taxonomyResponseSchema = z.object({ terms: z.array(taxonomyTermSchema) });

/** GET /v1/stats (P1, 홈 요약에 일부 사용) */
export const statsSchema = z.object({
  published: z.number().int(),
  byPhase: z.record(z.enum(PHASES), z.number().int()),
});
export type Stats = z.infer<typeof statsSchema>;

// ── 목록 쿼리 ─────────────────────────────────────────────────

export const SORTS = ['start_desc', 'start_asc', 'recent'] as const;
export type Sort = (typeof SORTS)[number];
export const FACET_PARAMS = ['category', 'partner_category', 'region', 'platform', 'collab_type'] as const;
export type FacetParam = (typeof FACET_PARAMS)[number];

export const collabQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.array(z.string()).default([]),
  partner_category: z.array(z.string()).default([]),
  region: z.array(z.string()).default([]),
  platform: z.array(z.string()).default([]),
  collab_type: z.array(z.string()).default([]),
  phase: z.enum(PHASES).optional(),
  /** YYYY-MM */
  from: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  property: z.string().optional(),
  company: z.string().optional(),
  sort: z.enum(SORTS).default('start_desc'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type CollabQuery = z.infer<typeof collabQuerySchema>;

// ── 관리자 ────────────────────────────────────────────────────

export const originSchema = z.object({
  type: z.enum(ORIGIN_TYPES),
  runId: z.string().nullable(),
  model: z.string().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
});
export type Origin = z.infer<typeof originSchema>;

const i18nTextSchema = z.object({
  title: z.string(),
  summary: z.string(),
  note: z.string(),
  machineTranslated: z.boolean().optional(),
});

/** 관리자 편집 폼 = PATCH /v1/admin/collabs/:id 본문 */
export const collabInputSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug는 소문자·숫자·하이픈만'),
  i18n: z.object({ ko: i18nTextSchema, en: i18nTextSchema }),
  parties: z.array(z.object({ propertyId: z.string(), role: z.enum(PARTY_ROLES) })),
  companies: z.array(z.object({ companyId: z.string(), role: z.enum(COMPANY_ROLES) })),
  category: z.string().nullable(),
  regions: z.array(z.string()),
  platforms: z.array(z.string()),
  collabTypes: z.array(z.string()),
  period: periodSchema,
  sources: z.array(sourceSchema.pick({ url: true, title: true, publisher: true, type: true, isPrimary: true, accessedAt: true })),
});
export type CollabInput = z.infer<typeof collabInputSchema>;

/** 관리자 조회용 전체 문서(내부 필드 포함) */
export const adminCollabSchema = collabInputSchema.extend({
  id: z.string(),
  status: z.enum(COLLAB_STATUSES),
  rev: z.number().int(),
  origin: originSchema,
  /** 수집 원본값 중 분류 키 매핑에 실패한 것. 원본은 보존된다. */
  unmapped: z.array(z.object({ field: z.string(), raw: z.string() })),
  sourceStatus: z.array(z.object({ url: z.string(), httpStatus: z.number().int().nullable() })),
  /** 중복 후보: 출처 URL 일치 또는 같은 작품 쌍 + 시작일 ±14일 */
  duplicates: z.array(
    z.object({ id: z.string(), slug: z.string(), title: z.string(), reason: z.enum(['same_source', 'same_parties_near_date']) }),
  ),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type AdminCollab = z.infer<typeof adminCollabSchema>;

export const adminQueueItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  status: z.enum(COLLAB_STATUSES),
  origin: z.enum(ORIGIN_TYPES),
  sourceCount: z.number().int(),
  duplicateCandidate: z.boolean(),
  updatedAt: z.iso.datetime(),
});
export type AdminQueueItem = z.infer<typeof adminQueueItemSchema>;

export const entityKindSchema = z.enum(['property', 'company']);
export type EntityKind = z.infer<typeof entityKindSchema>;

export const adminEntitySchema = z.object({
  id: z.string(),
  kind: entityKindSchema,
  slug: z.string(),
  name: z.object({ ko: z.string(), en: z.string(), original: z.string().nullable() }),
  aliases: z.array(z.string()),
  /** 작품: partner_category 키, 회사: null */
  category: z.string().nullable(),
  /** 회사: ISO 3166-1 alpha-2 */
  country: z.string().nullable(),
  collabCount: z.number().int(),
});
export type AdminEntity = z.infer<typeof adminEntitySchema>;

/** GET /v1/admin/match?name= */
export const matchResponseSchema = z.object({
  properties: z.array(adminEntitySchema.extend({ matchedAlias: z.string().nullable() })),
  companies: z.array(adminEntitySchema.extend({ matchedAlias: z.string().nullable() })),
});
export type MatchResponse = z.infer<typeof matchResponseSchema>;

export const TRANSITIONS = ['submit', 'publish', 'archive'] as const;
export type Transition = (typeof TRANSITIONS)[number];

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string().optional(),
    fields: z.record(z.string(), z.string()).optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
