import type {
  AdminCollab,
  AdminEntity,
  AdminQueueItem,
  CollabDetail,
  CollabInput,
  CollabListResponse,
  CollabQuery,
  CollabStatus,
  CompanyDetail,
  EntityKind,
  Locale,
  MatchResponse,
  OriginType,
  PropertyDetail,
  Stats,
  TaxonomyTerm,
  Transition,
} from '@/schema';

/** Express /v1 공개 조회 API (호출자: Next.js 서버) */
export interface PublicApi {
  listCollabs(query: CollabQuery, locale: Locale): Promise<CollabListResponse>;
  getCollab(slug: string, locale: Locale): Promise<CollabDetail | null>;
  getProperty(slug: string, locale: Locale): Promise<PropertyDetail | null>;
  getCompany(slug: string, locale: Locale): Promise<CompanyDetail | null>;
  getTaxonomies(): Promise<TaxonomyTerm[]>;
  getStats(): Promise<Stats>;
  exportCsv(query: CollabQuery, locale: Locale): Promise<string>;
  /** 프론트엔드가 추가로 요청하는 엔드포인트: GET /v1/sitemap */
  getSitemap(): Promise<SitemapData>;
}

export type SitemapData = {
  collabs: { slug: string; updatedAt: string }[];
  properties: { slug: string }[];
  companies: { slug: string }[];
};

export type QueueFilter = { status: 'review' | CollabStatus; origin?: OriginType };
export type QueueResponse = {
  items: AdminQueueItem[];
  counts: Record<'review' | CollabStatus, number>;
};

export type EntityInput = {
  slug: string;
  name: { ko: string; en: string; original: string | null };
  aliases: string[];
  category: string | null;
  country: string | null;
};

export type TermInput = Pick<TaxonomyTerm, 'key' | 'taxonomy' | 'parent' | 'label' | 'legacyValues'>;

/** Express /v1/admin (호출자: 관리자 화면, 단기 JWT) */
export interface AdminApi {
  listQueue(filter: QueueFilter): Promise<QueueResponse>;
  getCollab(id: string): Promise<AdminCollab | null>;
  createCollab(input: CollabInput): Promise<AdminCollab>;
  updateCollab(id: string, input: CollabInput, rev: number): Promise<AdminCollab>;
  transition(id: string, action: Transition, reason?: string): Promise<AdminCollab>;
  match(name: string): Promise<MatchResponse>;
  listEntities(kind: EntityKind, q?: string): Promise<AdminEntity[]>;
  createEntity(kind: EntityKind, input: EntityInput): Promise<AdminEntity>;
  updateEntity(kind: EntityKind, id: string, input: EntityInput): Promise<AdminEntity>;
  mergeEntities(kind: EntityKind, sourceId: string, targetId: string): Promise<AdminEntity>;
  createTerm(input: TermInput): Promise<TaxonomyTerm>;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message?: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message ?? code);
    this.name = 'ApiError';
  }
}
