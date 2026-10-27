import type {
  AdminCollab,
  AdminCover,
  AdminEntity,
  AdminQueueItem,
  CollabDetail,
  CollabInput,
  CollabListResponse,
  CollabQuery,
  CollabStatus,
  CompanyDetail,
  EntityKind,
  FeaturedProperty,
  FollowUpAction,
  FollowUpItem,
  FollowUpView,
  Locale,
  MatchResponse,
  OriginType,
  PropertyDetail,
  Stats,
  Submission,
  SubmissionInput,
  SubmissionKind,
  SubmissionStatus,
  TaxonomyTerm,
  Transition,
  UploadedMedia,
} from '@/schema';

/** Express /v1 공개 조회 API (호출자: Next.js 서버) */
export interface PublicApi {
  listCollabs(query: CollabQuery, locale: Locale): Promise<CollabListResponse>;
  getCollab(slug: string, locale: Locale): Promise<CollabDetail | null>;
  getProperty(slug: string, locale: Locale): Promise<PropertyDetail | null>;
  getCompany(slug: string, locale: Locale): Promise<CompanyDetail | null>;
  getTaxonomies(): Promise<TaxonomyTerm[]>;
  /** GET /v1/stats. 분류 라벨은 locale(기본 ko)로, year가 있으면 그해 시작한 콜라보만 */
  getStats(query?: StatsQuery): Promise<Stats>;
  /** 홈 'IP로 찾아보기': GET /v1/properties?featured=true. 백엔드가 아직 지원하지 않으면 빈 목록 */
  listFeaturedProperties(locale: Locale): Promise<FeaturedProperty[]>;
  /** 프론트엔드가 추가로 요청하는 엔드포인트: GET /v1/sitemap */
  getSitemap(): Promise<SitemapData>;
  /**
   * 방문자 제보: POST /v1/submissions. 브라우저는 Express를 직접 부르지 않으므로 방문자 IP를 X-Client-IP로 넘긴다
   * (백엔드가 IP당 시간당 10건으로 제한). 실패는 ApiError(rate_limited, bot_check_failed, not_found, validation_failed)
   */
  submitReport(input: SubmissionInput, clientIp: string | null): Promise<void>;
}

export type StatsQuery = { locale?: Locale; year?: number };

export type SitemapData = {
  collabs: { slug: string; updatedAt: string }[];
  /** updatedAt은 백엔드가 내려줄 때만 있다 */
  properties: { slug: string; updatedAt?: string }[];
  companies: { slug: string; updatedAt?: string }[];
};

export type QueueFilter = {
  status: 'review' | CollabStatus;
  origin?: OriginType;
  /** 커버 이미지가 없는 것만 */
  cover?: 'missing';
  /** 제목·작품·회사 이름 검색(백엔드 검색 토큰) */
  q?: string;
  /** 다음 페이지: 앞 응답의 nextCursor */
  cursor?: string;
};
export type QueueResponse = {
  items: AdminQueueItem[];
  counts: Record<'review' | CollabStatus, number>;
  /** 한 번에 100건까지. 더 있으면 다음 페이지 커서 */
  nextCursor: string | null;
};

export type EntityInput = {
  slug: string;
  name: { ko: string; en: string; original: string | null };
  aliases: string[];
  category: string | null;
  country: string | null;
  /** 작품만: 홈 노출 순서(null이면 노출 안 함). undefined면 본문에서 뺀다(건드리지 않음) */
  featuredOrder?: number | null;
  /** 작품만: 대표 이미지(null이면 지운다). undefined면 본문에서 뺀다(건드리지 않음) */
  image?: AdminCover | null;
};

export type SubmissionFilter = { status: SubmissionStatus; kind?: SubmissionKind };
export type SubmissionList = {
  items: Submission[];
  /** 종류별 미처리(new) 건수 */
  counts: Record<SubmissionKind, number>;
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
  /**
   * 백엔드가 작품 홈 노출(featuredOrder·image)을 지원하는지: 공개 GET /v1/properties?featured=true가 목록을 주는지로 본다.
   * 캐시하지 않는다(백엔드 배포 직후 바로 바뀌어야 한다)
   */
  supportsFeatured(): Promise<boolean>;
  createEntity(kind: EntityKind, input: EntityInput): Promise<AdminEntity>;
  updateEntity(kind: EntityKind, id: string, input: EntityInput): Promise<AdminEntity>;
  mergeEntities(kind: EntityKind, sourceId: string, targetId: string): Promise<AdminEntity>;
  createTerm(input: TermInput): Promise<TaxonomyTerm>;
  /**
   * 커버 이미지 업로드: POST /v1/admin/media (multipart, 필드 file).
   * size는 브라우저가 줄인 뒤 잰 크기로, 크기를 직접 읽지 못하는 목 API만 쓴다.
   */
  uploadMedia(file: File, size: { width: number; height: number }): Promise<UploadedMedia>;
  /** 커버의 원본 주소(originalUrl)를 저장소로 복사: POST /v1/admin/collabs/:id/cover/mirror (rev는 바뀌지 않는다) */
  mirrorCover(id: string): Promise<{ result: 'mirrored' | 'skipped' | 'failed'; collab: AdminCollab }>;
  /** 후속 확인 큐: GET /v1/admin/followups?view= (제안·자동 반영·알림·확인 예정, 최대 100건) */
  listFollowUps(view: FollowUpView, limit?: number): Promise<FollowUpItem[]>;
  /**
   * 재확인 제안 처리: POST /v1/admin/collabs/:id/followup.
   * apply는 일반 수정과 같아서 현재 rev가 필요하다(If-Match). dismiss·acknowledge는 rev를 쓰지 않는다.
   * acknowledge는 수집기가 초안에 바로 반영한 변경을 확인 처리한다(rev는 바뀌지 않는다).
   */
  resolveFollowUp(id: string, action: FollowUpAction, rev?: number): Promise<AdminCollab>;
  /** 제보 큐: GET /v1/admin/submissions?status=&kind= (최신순, 최대 100건) */
  listSubmissions(filter: SubmissionFilter): Promise<SubmissionList>;
  /** 제보 처리: PATCH /v1/admin/submissions/:id */
  updateSubmission(id: string, status: SubmissionStatus): Promise<Submission>;
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
