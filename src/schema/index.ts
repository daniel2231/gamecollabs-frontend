/**
 * 공유 스키마. PRD의 packages/schema에 해당하며, 모노레포로 옮길 때 이 폴더를 그대로 이동한다.
 * API 응답(공개)과 관리자 입력 스키마를 함께 정의한다.
 */
import { z } from 'zod';
import { PHASES, SORTS, TAXONOMIES } from './constants';

export * from './constants';

export const LOCALES = ['ko', 'en'] as const;
export const localeSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof localeSchema>;

// ── 분류(taxonomy) ─────────────────────────────────────────────

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
/** unspecified: 이관된 MVP 데이터처럼 역할이 기록되지 않은 경우 */
export const COMPANY_ROLES = ['publisher', 'developer', 'licensor', 'brand_partner', 'organizer', 'unspecified'] as const;
export type CompanyRole = (typeof COMPANY_ROLES)[number];
export const SOURCE_TYPES = ['official', 'press', 'social', 'store'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];
export const COLLAB_STATUSES = ['draft', 'in_review', 'published', 'archived'] as const;
export type CollabStatus = (typeof COLLAB_STATUSES)[number];
export const ORIGIN_TYPES = ['manual', 'gpt', 'agent', 'migration'] as const;
export type OriginType = (typeof ORIGIN_TYPES)[number];

const localizedName = z.object({
  /** 요청 locale의 이름. 한·영 모두 필수라 fallback은 항상 false다(목 데이터 호환용으로 남김). */
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

/** 오프라인 콜라보 장소(공개 응답). 이름은 요청 언어, 주소는 공식 표기 그대로(현지어) */
export const venueSchema = z.object({
  name: z.string(),
  address: z.string().nullable(),
  url: z.string().nullable(),
});
export type Venue = z.infer<typeof venueSchema>;

export const coverSchema = z.object({
  url: z.string(),
  originalUrl: z.string().nullable(),
  credit: z.string().nullable(),
  alt: z.string(),
  /** 미러링 전 이미지는 크기를 모른다 */
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
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
  note: z.string().nullable(),
  companies: z.array(companyRefSchema),
  sources: z.array(sourceSchema),
  venues: z.array(venueSchema),
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
/**
 * GET /v1/properties?featured=true: 홈 'IP로 찾아보기'에 노출할 작품(운영자가 고른 순서).
 * 이미지는 작품 대표 이미지(image)가 먼저, 없으면 가장 최근 콜라보 커버(latestCover)를 쓴다.
 */
export const featuredPropertySchema = z.object({
  slug: z.string(),
  kind: termRefSchema,
  name: localizedName,
  /** 발행된 콜라보 수 */
  collabCount: z.number().int(),
  /** 함께 콜라보한 상대 작품 수 */
  counterpartCount: z.number().int(),
  /** 지금 진행 중인 콜라보 수 */
  ongoingCount: z.number().int(),
  image: coverSchema.nullable(),
  latestCover: coverSchema.nullable(),
});
export type FeaturedProperty = z.infer<typeof featuredPropertySchema>;

export const taxonomyResponseSchema = z.object({ terms: z.array(taxonomyTermSchema) });

/** 통계 순위에 오르는 회사 역할(역할 미지정은 뺀다) */
export const STATS_COMPANY_ROLES = ['publisher', 'developer', 'licensor', 'brand_partner', 'organizer'] as const;
export type StatsCompanyRole = (typeof STATS_COMPANY_ROLES)[number];

const termCount = termRefSchema.extend({ count: z.number().int() });
const rankedEntity = z.object({ slug: z.string(), name: z.string(), count: z.number().int() });

/**
 * GET /v1/stats: 홈 현황과 통계 페이지. year가 있으면 그해 시작한 콜라보만 센다(years는 예외로 전체 연도).
 * 새 필드는 이전 백엔드가 주지 않아도 화면이 깨지지 않도록 기본값을 둔다.
 */
export const statsSchema = z.object({
  published: z.number().int(),
  byPhase: z.record(z.enum(PHASES), z.number().int()),
  year: z.number().int().nullable().default(null),
  /** 시작일이 없는 콜라보 수(월별·연도별에서 빠진다) */
  undated: z.number().int().default(0),
  /** 시작 월(YYYY-MM)별 건수, 오름차순. 건수 0인 달은 없다 */
  monthly: z.array(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), count: z.number().int() })).default([]),
  /** 시작 연도별 건수, 오름차순 */
  years: z.array(z.object({ year: z.number().int(), count: z.number().int() })).default([]),
  category: z.array(termCount).default([]),
  partnerCategory: z.array(termCount).default([]),
  region: z.array(termCount).default([]),
  platform: z.array(termCount).default([]),
  collabType: z.array(termCount).default([]),
  topHosts: z.array(rankedEntity.extend({ kind: termRefSchema.nullable() })).default([]),
  topPartners: z.array(rankedEntity.extend({ kind: termRefSchema.nullable() })).default([]),
  topCompanies: z.partialRecord(z.enum(STATS_COMPANY_ROLES), z.array(rankedEntity)).default({}),
});
export type Stats = z.infer<typeof statsSchema>;
export type RankedEntity = z.infer<typeof rankedEntity>;
export type TermCount = z.infer<typeof termCount>;

// ── 목록 쿼리 ─────────────────────────────────────────────────


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

/** 한국어·영어 제목과 요약은 모두 필수다(메모는 둘 다 쓰거나 둘 다 비운다). */
const i18nTextSchema = z.object({
  title: z.string(),
  summary: z.string(),
  note: z.string(),
});

/**
 * 관리자 커버. storageKey는 우리 저장소(업로드·미러링)의 키, url은 미리보기용 주소다.
 * storageKey가 없으면 아직 미러링하지 않은 원본(originalUrl)만 있는 상태다.
 */
export const adminCoverSchema = z.object({
  storageKey: z.string().nullable(),
  url: z.string(),
  originalUrl: z.string().nullable(),
  credit: z.string().max(120, '120자 이하'),
  alt: z.object({ ko: z.string().max(300, '300자 이하'), en: z.string().max(300, '300자 이하') }),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  /** 원본 주소를 저장소로 복사하지 못한 이유(조회 전용, 저장할 때는 보내지 않는다) */
  mirrorError: z.string().nullable().optional(),
});
export type AdminCover = z.infer<typeof adminCoverSchema>;

/** POST /v1/admin/media 응답 */
export const uploadedMediaSchema = z.object({
  storageKey: z.string(),
  url: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type UploadedMedia = z.infer<typeof uploadedMediaSchema>;

/** 관리자 장소 입력. 백엔드 VenueInput과 같은 규칙(이름 한·영 필수, 주소·URL은 없을 수 있음) */
export const adminVenueSchema = z.object({
  name: z.object({
    ko: z.string().trim().min(1, '한국어 이름 필수').max(200, '200자 이하'),
    en: z.string().trim().min(1, '영어 이름 필수').max(200, '200자 이하'),
  }),
  address: z.string().trim().min(1).max(300, '300자 이하').nullable(),
  url: z.url({ protocol: /^https?$/, error: 'http(s) 주소' }).nullable(),
});
export type AdminVenue = z.infer<typeof adminVenueSchema>;

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
  /**
   * 입력: undefined면 커버를 건드리지 않고(본문에서 뺀다), null이면 지운다.
   * 조회: undefined면 백엔드가 관리자 응답에 커버를 주지 않은 것(현재 값을 모름).
   */
  cover: adminCoverSchema.nullable().optional(),
  /** 오프라인 콜라보 장소. undefined면 본문에서 뺀다(백엔드가 관리자 응답에 주지 않아 현재 값을 모를 때) */
  venues: z.array(adminVenueSchema).max(20, '20곳 이하').optional(),
  /**
   * 콜라보 내용(아이템·스킨·이벤트 등)이 아직 발표되지 않음. 켜 두면 후속 확인 대상이 된다.
   * undefined면 본문에서 뺀다(백엔드가 관리자 응답에 주지 않아 현재 값을 모를 때)
   */
  contentTba: z.boolean().optional(),
});
export type CollabInput = z.infer<typeof collabInputSchema>;

// ── 후속 확인(날짜 미정 콜라보 재확인) ─────────────────────────

/**
 * 다시 확인할 사유. 백엔드가 기간과 contentTba에서 계산한다(날짜가 먼저).
 * start_tba: 시작일 미발표 · month_only: 시작 월만 앎 · end_tba: 종료일 미발표 · end_missing: 종료일 누락(fixed인데 비어 있음)
 * · content_tba: 날짜는 다 있고 내용만 미발표
 */
export const FOLLOW_UP_REASONS = ['start_tba', 'month_only', 'end_tba', 'end_missing', 'content_tba'] as const;
export type FollowUpReason = (typeof FOLLOW_UP_REASONS)[number];
/** queued: 재확인 중인 전체(차례가 안 된 것 포함, 다음 확인일 순) */
export const FOLLOW_UP_VIEWS = ['proposals', 'applied', 'escalated', 'queued'] as const;
export type FollowUpView = (typeof FOLLOW_UP_VIEWS)[number];
/** apply·dismiss: 재확인 제안 처리, acknowledge: 초안에 바로 반영된 변경을 확인함 */
export const FOLLOW_UP_ACTIONS = ['apply', 'dismiss', 'acknowledge'] as const;
export type FollowUpAction = (typeof FOLLOW_UP_ACTIONS)[number];

/** 재확인에서 찾은 변경. 검수 중·발행된 콜라보는 바로 고치지 않고 관리자가 반영하거나 버린다 */
export const followUpProposalSchema = z.object({
  /** 바뀔 기간 전체(보낸 경우만) */
  period: periodSchema.nullable(),
  /** 바뀔 제목·요약(보낸 경우만) */
  i18n: z.object({ ko: z.object({ title: z.string(), summary: z.string() }), en: z.object({ title: z.string(), summary: z.string() }) }).nullable(),
  /** 바뀔 내용 미정 여부(보낸 경우만, 보통 내용이 발표되어 false) */
  contentTba: z.boolean().nullable(),
  /** 근거 출처(반영하면 기존 출처 뒤에 붙는다) */
  sources: z.array(z.object({ url: z.string(), title: z.string().nullable(), publisher: z.string().nullable() })),
  note: z.string().nullable(),
  /** 제안할 때의 rev */
  rev: z.number().int(),
  by: z.string(),
  at: z.iso.datetime(),
});
export type FollowUpProposal = z.infer<typeof followUpProposalSchema>;

const followUpTextSchema = z.object({ ko: z.object({ title: z.string(), summary: z.string() }), en: z.object({ title: z.string(), summary: z.string() }) });

/**
 * 수집기가 초안에 바로 반영했지만 관리자가 아직 확인하지 않은 변경. 확인할 때까지 남는다.
 * 여러 번 반영되면 하나로 합쳐진다(before는 처음 반영 전 값, 변경은 마지막 값, rev는 반영 후).
 */
export const followUpAppliedSchema = followUpProposalSchema.extend({
  before: z.object({ period: periodSchema, text: followUpTextSchema, contentTba: z.boolean() }),
});
export type FollowUpApplied = z.infer<typeof followUpAppliedSchema>;

export const followUpStateSchema = z.object({
  reason: z.enum(FOLLOW_UP_REASONS).nullable(),
  nextCheckAt: z.iso.datetime().nullable(),
  lastCheckedAt: z.iso.datetime().nullable(),
  /** 연속으로 변화가 없던 확인 횟수 */
  unchanged: z.number().int(),
  /** 여러 번 확인해도 소식이 없어 사람이 결정해야 함 */
  escalated: z.boolean(),
  proposal: followUpProposalSchema.nullable(),
  /** 초안에 바로 반영된 변경 중 관리자가 아직 확인하지 않은 것 */
  applied: followUpAppliedSchema.nullable(),
});
export type FollowUpState = z.infer<typeof followUpStateSchema>;

/** GET /v1/admin/followups 항목 */
export const followUpItemSchema = followUpStateSchema.extend({
  id: z.string(),
  slug: z.string(),
  status: z.enum(COLLAB_STATUSES),
  rev: z.number().int(),
  title: z.string(),
  /** 지금 저장된 제목·요약(제안과 비교용) */
  text: followUpTextSchema,
  period: periodSchema,
  /** 내용 미정. 사유가 날짜여도 켜져 있으면 내용도 같이 확인한다 */
  contentTba: z.boolean(),
  sourceUrls: z.array(z.string()),
});
export type FollowUpItem = z.infer<typeof followUpItemSchema>;

/** 관리자 조회용 전체 문서(내부 필드 포함) */
export const adminCollabSchema = collabInputSchema.extend({
  /** 수집 초안은 아직 작품에 연결되지 않은 참여자(propertyId=null, 수집된 이름만)를 가질 수 있다 */
  parties: z.array(
    z.object({
      propertyId: z.string().nullable(),
      role: z.enum(PARTY_ROLES),
      name: z.object({ ko: z.string(), en: z.string() }).nullable(),
    }),
  ),
  id: z.string(),
  status: z.enum(COLLAB_STATUSES),
  rev: z.number().int(),
  origin: originSchema,
  /** 수집 원본값 중 분류 키 매핑에 실패한 것. 원본은 보존된다. */
  unmapped: z.array(z.object({ field: z.string(), raw: z.string() })),
  /** 편집기 필드가 없는 원본값(파트너 분류, 회사 등). 참고용으로만 보여준다. */
  unmappedOther: z.array(z.object({ field: z.string(), raw: z.string() })),
  sourceStatus: z.array(z.object({ url: z.string(), httpStatus: z.number().int().nullable() })),
  /** 중복 후보: 출처 URL 일치 또는 같은 작품 쌍 + 시작일 ±14일 */
  duplicates: z.array(
    z.object({ id: z.string(), slug: z.string(), title: z.string(), reason: z.enum(['same_source', 'same_parties_near_date']) }),
  ),
  /** 후속 확인 상태. undefined면 백엔드가 아직 주지 않음 */
  followUp: followUpStateSchema.optional(),
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
  /** 우리 저장소에 올렸거나 원본 주소가 있는 커버가 있는지. null이면 백엔드가 알려주지 않음 */
  hasCover: z.boolean().nullable(),
  /** 수집기가 바꾼 뒤 관리자가 아직 확인하지 않음 */
  followUpApplied: z.boolean(),
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
  /**
   * 작품: 홈 'IP로 찾아보기' 노출 순서(작은 수가 앞). null이면 노출하지 않는다.
   * undefined면 백엔드가 알려주지 않음(회사이거나 아직 지원 전). 저장할 때 건드리지 않는다
   */
  featuredOrder: z.number().int().min(1).nullable().optional(),
  /** 작품 대표 이미지. undefined면 백엔드가 알려주지 않음(저장할 때 건드리지 않는다) */
  image: adminCoverSchema.nullable().optional(),
});
export type AdminEntity = z.infer<typeof adminEntitySchema>;

/** GET /v1/admin/match?name= */
export const matchResponseSchema = z.object({
  properties: z.array(adminEntitySchema.extend({ matchedAlias: z.string().nullable() })),
  companies: z.array(adminEntitySchema.extend({ matchedAlias: z.string().nullable() })),
});
export type MatchResponse = z.infer<typeof matchResponseSchema>;

/** reopen: 검수 요청됨·보관 → 초안 */
export const TRANSITIONS = ['submit', 'publish', 'archive', 'reopen'] as const;
export type Transition = (typeof TRANSITIONS)[number];

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string().optional(),
    fields: z.record(z.string(), z.string()).optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

// ── 제보 (F-15) ───────────────────────────────────────────────

/** tip: 아직 없는 콜라보 제보 · correction: 발행된 콜라보의 오류 제보 */
export const SUBMISSION_KINDS = ['tip', 'correction'] as const;
export type SubmissionKind = (typeof SUBMISSION_KINDS)[number];
export const SUBMISSION_STATUSES = ['new', 'accepted', 'dismissed'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/** 방문자 제보: POST /v1/submissions 본문(서버 액션이 검증 후 X-Client-IP와 함께 보낸다) */
export const submissionInputSchema = z
  .object({
    kind: z.enum(SUBMISSION_KINDS),
    url: z.url({ protocol: /^https?$/, error: 'invalid_url' }).max(2000, 'too_long').optional(),
    collab: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(200).optional(),
    note: z.string().trim().max(1000, 'too_long').optional(),
    locale: localeSchema,
    turnstileToken: z.string().max(4096).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === 'tip') {
      if (!v.url) ctx.addIssue({ code: 'custom', path: ['url'], message: 'required' });
      return;
    }
    if (!v.collab) ctx.addIssue({ code: 'custom', path: ['collab'], message: 'required' });
    if (!v.note) ctx.addIssue({ code: 'custom', path: ['note'], message: 'required' });
    else if (v.note.length < 5) ctx.addIssue({ code: 'custom', path: ['note'], message: 'too_short' });
  });
export type SubmissionInput = z.infer<typeof submissionInputSchema>;

/** GET /v1/admin/submissions 항목 */
export const submissionSchema = z.object({
  id: z.string(),
  kind: z.enum(SUBMISSION_KINDS),
  status: z.enum(SUBMISSION_STATUSES),
  url: z.string().nullable(),
  note: z.string().nullable(),
  locale: localeSchema.nullable(),
  /** correction은 대상 콜라보, tip은 처리하며 연결한 콜라보 */
  collab: z
    .object({ id: z.string(), slug: z.string(), status: z.enum(COLLAB_STATUSES), title: z.object({ ko: z.string(), en: z.string() }) })
    .nullable(),
  createdAt: z.iso.datetime(),
});
export type Submission = z.infer<typeof submissionSchema>;

// ── 변경 내역 ───────────────────────────────────────────────

/** 백엔드와 같은 규칙: 영문·숫자로 시작, 이후 영문·숫자·`.`·`-`·`+` (예: 1.4.0, v2, 2026.10) */
export const changelogVersionSchema = z
  .string()
  .trim()
  .min(1, '필수')
  .max(40, '40자 이하')
  .regex(/^[0-9A-Za-z][0-9A-Za-z.+-]*$/, '영문·숫자·. - +만 사용');

/** GET /v1/changelog 항목. body는 요청 언어의 마크다운 */
export const changelogEntrySchema = z.object({
  id: z.string(),
  version: z.string(),
  date: z.iso.date(),
  body: z.string(),
});
export type ChangelogEntry = z.infer<typeof changelogEntrySchema>;

const changelogBody = z.string().trim().min(1, '필수').max(10_000, '1만 자 이하');

/** 관리자 작성·수정 본문 */
export const changelogInputSchema = z.object({
  version: changelogVersionSchema,
  date: z.iso.date('YYYY-MM-DD'),
  body: z.object({ ko: changelogBody, en: changelogBody }),
  published: z.boolean(),
});
export type ChangelogInput = z.infer<typeof changelogInputSchema>;

/** GET /v1/admin/changelog 항목(비공개 포함, 두 언어) */
export const adminChangelogEntrySchema = changelogInputSchema.extend({
  id: z.string(),
  version: z.string(),
  body: z.object({ ko: z.string(), en: z.string() }),
  updatedAt: z.iso.datetime().nullable(),
});
export type AdminChangelogEntry = z.infer<typeof adminChangelogEntrySchema>;
