import 'server-only';
import { z } from 'zod';
import {
  adminChangelogEntrySchema,
  adminCollabSchema,
  adminEntitySchema,
  adminQueueItemSchema,
  changelogEntrySchema,
  collabDetailSchema,
  collabListResponseSchema,
  companyDetailSchema,
  featuredPropertySchema,
  followUpItemSchema,
  matchResponseSchema,
  propertyDetailSchema,
  statsSchema,
  submissionSchema,
  taxonomyTermSchema,
  uploadedMediaSchema,
  type CollabQuery,
  type EntityKind,
  type Locale,
} from '@/schema';
import * as A from './adapt';
import { apiBaseUrl } from './config';
import { ApiError, type AdminApi, type PublicApi } from './types';

/**
 * Express /v1 HTTP 클라이언트. 브라우저에서는 절대 쓰지 않는다(server-only).
 * 응답(`{ data, meta }`)은 adapt.ts에서 화면 스키마로 바꾼 뒤 그 스키마로 다시 검증한다.
 * 캐시 태그: collabs, collab:<slug>, property:<slug>, company:<slug>, taxonomies, featured(홈 노출 작품), changelog
 * → Express가 발행·수정 시 /api/revalidate 웹훅으로 무효화한다.
 */

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
  tags?: string[];
  headers?: Record<string, string>;
  /** 404를 null로 돌려줄지 */
  nullOn404?: boolean;
  /** 공개 조회도 캐시하지 않는다 */
  noStore?: boolean;
};

function baseUrl(): string {
  const url = apiBaseUrl();
  // index.ts가 같은 함수로 목/실제를 고르므로 정상 흐름에서는 여기 오지 않는다
  if (!url) throw new Error('API_BASE_URL is empty: the HTTP API client was used without a base URL');
  return url;
}

async function request(path: string, opts: RequestOptions = {}): Promise<Response | null> {
  const isRead = !opts.method || opts.method === 'GET';
  const res = await fetch(`${baseUrl()}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${opts.token ?? process.env.API_SERVICE_TOKEN ?? ''}`,
      // FormData는 fetch가 boundary를 붙인 multipart Content-Type을 직접 정한다
      ...(opts.body !== undefined && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...opts.headers,
    },
    body: opts.body === undefined ? undefined : opts.body instanceof FormData ? opts.body : JSON.stringify(opts.body),
    // 공개 조회는 태그 캐시(웹훅으로 무효화), 관리자 요청은 항상 최신
    ...(isRead && !opts.token && !opts.noStore ? { next: { tags: opts.tags ?? [], revalidate: 3600 } } : { cache: 'no-store' as const }),
  });
  if (res.status === 404 && opts.nullOn404) return null;
  if (!res.ok) {
    const parsed = backendErrorSchema.safeParse(await res.json().catch(() => null));
    if (parsed.success) {
      const { code, message, fields } = parsed.data.error;
      throw new ApiError(res.status, code, message ?? ERROR_MESSAGES[code], A.flattenFields(fields));
    }
    throw new ApiError(res.status, 'http_error', `${res.status} ${res.statusText}`);
  }
  return res;
}

/** Express 오류: 필드 오류는 경로별 메시지 배열 */
const backendErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string().optional(),
    fields: z.record(z.string(), z.array(z.string())).optional(),
  }),
});

const ERROR_MESSAGES: Record<string, string> = {
  rev_conflict: '다른 사람이 먼저 수정했습니다. 새로고침 후 다시 시도하세요.',
  proposal_pending: '이 콜라보에는 처리하지 않은 재확인 제안이 있습니다.',
  precondition_failed: '다른 사람이 먼저 수정했습니다. 새로고침 후 다시 시도하세요.',
  invalid_transition: '현재 상태에서는 할 수 없는 작업입니다.',
  forbidden: '권한이 없습니다.',
};

type Envelope<T, M = Record<string, unknown>> = { data: T; meta?: M };

/** `{ data, meta }` 본문. 404를 null로 받는 경우를 위해 null을 그대로 넘긴다. */
async function envelope<T, M = Record<string, unknown>>(path: string, opts?: RequestOptions): Promise<Envelope<T, M> | null> {
  const res = await request(path, opts);
  return res ? ((await res.json()) as Envelope<T, M>) : null;
}

async function data<T>(path: string, opts?: RequestOptions): Promise<T> {
  const body = await envelope<T>(path, opts);
  if (body === null) throw new ApiError(404, 'not_found');
  return body.data;
}

export function queryToParams(query: CollabQuery, locale: Locale): URLSearchParams {
  return A.toListParams(query, locale);
}

export const httpPublicApi: PublicApi = {
  listCollabs: async (query, locale) => {
    const body = await envelope<A.BeCard[], { total: number; nextCursor: string | null }>(
      `/v1/collabs?${queryToParams(query, locale)}`,
      { tags: ['collabs'] },
    );
    if (!body?.meta) throw new ApiError(502, 'bad_response');
    return collabListResponseSchema.parse(A.toListResponse(body.data, body.meta));
  },
  getCollab: async (slug, locale) => {
    const body = await envelope<A.BeDetail>(`/v1/collabs/${encodeURIComponent(slug)}?locale=${locale}`, {
      tags: ['collabs', `collab:${slug}`],
      nullOn404: true,
    });
    return body && collabDetailSchema.parse(A.toDetail(body.data));
  },
  getProperty: async (slug, locale) => {
    const body = await envelope<A.BeEntityPage>(`/v1/properties/${encodeURIComponent(slug)}?locale=${locale}`, {
      tags: ['collabs', `property:${slug}`],
      nullOn404: true,
    });
    return body && propertyDetailSchema.parse(A.toProperty(body.data));
  },
  getCompany: async (slug, locale) => {
    const body = await envelope<A.BeEntityPage>(`/v1/companies/${encodeURIComponent(slug)}?locale=${locale}`, {
      tags: ['collabs', `company:${slug}`],
      nullOn404: true,
    });
    return body && companyDetailSchema.parse(A.toCompany(body.data));
  },
  getTaxonomies: async () =>
    z.array(taxonomyTermSchema).parse(A.flattenTaxonomy(await data<A.BeTaxonomyTree>('/v1/taxonomies', { tags: ['taxonomies'] }))),
  getStats: async ({ locale = 'ko', year } = {}) => {
    const sp = new URLSearchParams({ locale });
    if (year) sp.set('year', String(year));
    return statsSchema.parse(A.toStats(await data<A.BeStats>(`/v1/stats?${sp}`, { tags: ['collabs'] })));
  },
  listFeaturedProperties: async (locale) => {
    // 백엔드가 아직 이 필터를 모르면(404 또는 다른 응답 형태) 섹션을 숨긴다. 홈 전체가 깨지지 않게 한다
    try {
      const body = await envelope<A.BeFeaturedProperty[]>(`/v1/properties?featured=true&locale=${locale}`, {
        tags: ['collabs', 'featured'],
        nullOn404: true,
      });
      return body ? z.array(featuredPropertySchema).parse(body.data.map(A.toFeaturedProperty)) : [];
    } catch (e) {
      console.error('featured properties unavailable', e);
      return [];
    }
  },
  getSitemap: async () => A.toSitemap(await data<Parameters<typeof A.toSitemap>[0]>('/v1/sitemap', { tags: ['collabs'] })),
  submitReport: async (input, clientIp) => {
    await request('/v1/submissions', {
      method: 'POST',
      body: input,
      ...(clientIp ? { headers: { 'X-Client-IP': clientIp } } : {}),
    });
  },
  listChangelog: async (locale) => {
    // 백엔드에 아직 변경 내역이 없으면(404) 빈 페이지로 보여 준다
    const body = await envelope<unknown[]>(`/v1/changelog?locale=${locale}`, { tags: ['changelog'], nullOn404: true });
    return body ? z.array(changelogEntrySchema).parse(body.data) : [];
  },
};

/** 커버 없음 필터를 프론트에서 거를 때: 이만큼 모이거나 이 페이지 수(100건씩)에 닿을 때까지 읽는다 */
const COVER_FILTER_MIN = 30;
const COVER_FILTER_MAX_PAGES = 10;

/** 커버 이미지 주소의 기준(백엔드와 같은 값) */
const mediaBase = () => process.env.MEDIA_BASE_URL?.trim() || null;

const entityPath = (kind: EntityKind) => (kind === 'property' ? 'properties' : 'companies');

export function createHttpAdminApi(token: string): AdminApi {
  const o = (extra: RequestOptions = {}): RequestOptions => ({ token, ...extra });
  const raw = (id: string) => data<A.BeAdminCollab>(`/v1/admin/collabs/${id}`, o());
  /** 문서 + 중복 후보를 함께 읽어 편집기 형태로 */
  const full = async (doc: A.BeAdminCollab) => {
    const duplicates = await data<A.BeDuplicate[]>(`/v1/admin/collabs/${doc.id}/duplicates`, o());
    return adminCollabSchema.parse(A.toAdminCollab(doc, duplicates, mediaBase()));
  };
  const entity = (kind: EntityKind, e: A.BeEntityDoc) => adminEntitySchema.parse(A.fromEntityDoc(kind, e, mediaBase()));

  return {
    listQueue: async (filter) => {
      type Meta = { counts: Record<'draft' | 'in_review' | 'published' | 'archived', number>; nextCursor?: string | null };
      const page = async (cursor?: string) => {
        const body = await envelope<A.BeAdminCollab[], Meta>(`/v1/admin/collabs?${A.queueParams({ ...filter, cursor })}`, o());
        if (!body?.meta) throw new ApiError(502, 'bad_response');
        return A.toQueue(body.data, body.meta.counts, filter, body.meta.nextCursor ?? null);
      };
      const first = await page(filter.cursor);
      const items = [...first.items];
      let nextCursor = first.nextCursor;
      // “커버 없음만”은 백엔드가 아직 거르지 않으면 받은 페이지 안에서만 걸러진다. 그러면 첫 100건에
      // 해당 항목이 없을 때 빈 목록이 되므로, 어느 정도 모일 때까지 다음 페이지를 이어서 읽는다.
      // 백엔드가 거르게 되면 첫 페이지에서 충분히 차서 추가로 읽지 않는다.
      for (let pages = 1; filter.cover === 'missing' && nextCursor && items.length < COVER_FILTER_MIN && pages < COVER_FILTER_MAX_PAGES; pages++) {
        const more = await page(nextCursor);
        items.push(...more.items);
        nextCursor = more.nextCursor;
      }
      return { ...first, items: z.array(adminQueueItemSchema).parse(items), nextCursor };
    },
    getCollab: async (id) => {
      const body = await envelope<A.BeAdminCollab>(`/v1/admin/collabs/${id}`, o({ nullOn404: true }));
      return body && full(body.data);
    },
    createCollab: async (input) =>
      full(await data<A.BeAdminCollab>('/v1/admin/collabs', o({ method: 'POST', body: A.toCollabBody(input) }))),
    updateCollab: async (id, input, rev) => {
      const current = await raw(id);
      return full(
        await data<A.BeAdminCollab>(`/v1/admin/collabs/${id}`, {
          ...o({ method: 'PATCH', body: A.toCollabBody(input, current.parties) }),
          headers: { 'If-Match': String(rev) },
        }),
      );
    },
    transition: async (id, action, reason) =>
      full(
        await data<A.BeAdminCollab>(
          `/v1/admin/collabs/${id}/transition`,
          o({ method: 'POST', body: { action, ...(reason ? { reason } : {}) } }),
        ),
      ),
    match: async (name) => {
      const res = await data<{ properties: A.BeEntitySummary[]; companies: A.BeEntitySummary[] }>(
        `/v1/admin/match?name=${encodeURIComponent(name)}&locale=ko`,
        o(),
      );
      return matchResponseSchema.parse({
        properties: res.properties.map((e) => ({ ...A.fromEntitySummary('property', e, mediaBase()), matchedAlias: null })),
        companies: res.companies.map((e) => ({ ...A.fromEntitySummary('company', e, mediaBase()), matchedAlias: null })),
      });
    },
    listEntities: async (kind, q) => {
      const sp = new URLSearchParams({ locale: 'ko' });
      if (q) sp.set('q', q);
      const list = await data<A.BeEntitySummary[]>(`/v1/admin/${entityPath(kind)}?${sp}`, o());
      return z.array(adminEntitySchema).parse(list.map((e) => A.fromEntitySummary(kind, e, mediaBase())));
    },
    supportsFeatured: async () => {
      // 공개 엔드포인트라 서비스 토큰으로 부른다(관리자 토큰이 공개 경로에서 통하는지와 무관하게)
      try {
        const res = await request('/v1/properties?featured=true&locale=ko', { nullOn404: true, noStore: true });
        if (!res) return false;
        const body = (await res.json()) as { data?: unknown };
        return Array.isArray(body.data);
      } catch {
        return false;
      }
    },
    createEntity: async (kind, input) =>
      entity(kind, await data(`/v1/admin/${entityPath(kind)}`, o({ method: 'POST', body: A.toEntityBody(kind, input) }))),
    updateEntity: async (kind, id, input) =>
      entity(kind, await data(`/v1/admin/${entityPath(kind)}/${id}`, o({ method: 'PATCH', body: A.toEntityBody(kind, input) }))),
    setFeaturedOrder: async (ids) => {
      const list = await data<A.BeEntitySummary[]>('/v1/admin/properties/featured?locale=ko', o({ method: 'PUT', body: { ids } }));
      return z.array(adminEntitySchema).parse(list.map((e) => A.fromEntitySummary('property', e, mediaBase())));
    },
    // Express: :id가 남고 from이 흡수된다
    mergeEntities: async (kind, sourceId, targetId) =>
      entity(kind, await data(`/v1/admin/${entityPath(kind)}/${targetId}/merge`, o({ method: 'POST', body: { from: sourceId } }))),
    mirrorCover: async (id) => {
      const res = await data<{ result: 'mirrored' | 'skipped' | 'failed'; collab: A.BeAdminCollab }>(
        `/v1/admin/collabs/${id}/cover/mirror`,
        o({ method: 'POST' }),
      );
      return { result: res.result, collab: await full(res.collab) };
    },
    listFollowUps: async (view, limit = 50) => {
      try {
        const rows = await data<A.BeFollowUpRow[]>(`/v1/admin/followups?${new URLSearchParams({ view, limit: String(limit) })}`, o());
        return z.array(followUpItemSchema).parse(rows.map(A.toFollowUpItem));
      } catch (e) {
        // 백엔드에 아직 후속 확인 기능이 없을 때
        if (e instanceof ApiError && e.status === 404) {
          throw new ApiError(501, 'followups_unavailable', '백엔드에 후속 확인 API(GET /v1/admin/followups)가 아직 없습니다. 백엔드 배포 후 다시 시도하세요.');
        }
        throw e;
      }
    },
    resolveFollowUp: async (id, action, rev) =>
      full(
        await data<A.BeAdminCollab>(`/v1/admin/collabs/${id}/followup`, {
          ...o({ method: 'POST', body: { action } }),
          ...(rev ? { headers: { 'If-Match': String(rev) } } : {}),
        }),
      ),
    listSubmissions: async ({ status, kind }) => {
      const sp = new URLSearchParams({ status, limit: '100' });
      if (kind) sp.set('kind', kind);
      const body = await envelope<A.BeSubmission[], { counts?: Partial<Record<'tip' | 'correction', number>> }>(`/v1/admin/submissions?${sp}`, o());
      if (!body) throw new ApiError(404, 'not_found');
      // 오류 제보 이전 백엔드는 kind를 몰라 걸러 주지 않는다
      const items = z.array(submissionSchema).parse(body.data.map(A.toSubmission)).filter((s) => !kind || s.kind === kind);
      return { items, counts: A.submissionCounts(items, body.meta?.counts) };
    },
    updateSubmission: async (id, status) =>
      submissionSchema.parse(
        A.toSubmission(await data<A.BeSubmission>(`/v1/admin/submissions/${encodeURIComponent(id)}`, o({ method: 'PATCH', body: { status } }))),
      ),
    uploadMedia: async (file) => {
      const form = new FormData();
      form.set('file', file, file.name);
      try {
        return uploadedMediaSchema.parse(A.fromMedia(await data<A.BeMedia>('/v1/admin/media', o({ method: 'POST', body: form })), mediaBase()));
      } catch (e) {
        // 백엔드에 아직 업로드 라우트가 없을 때
        if (e instanceof ApiError && (e.status === 404 || e.status === 405)) {
          throw new ApiError(501, 'media_upload_unavailable', '백엔드에 업로드 API(POST /v1/admin/media)가 아직 없습니다. 백엔드 배포 후 다시 시도하세요.');
        }
        throw e;
      }
    },
    listChangelog: async () => {
      try {
        return z.array(adminChangelogEntrySchema).parse(await data<unknown[]>('/v1/admin/changelog', o()));
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          throw new ApiError(501, 'changelog_unavailable', '백엔드에 변경 내역 API(GET /v1/admin/changelog)가 아직 없습니다. 백엔드 배포 후 다시 시도하세요.');
        }
        throw e;
      }
    },
    createChangelog: async (input) =>
      adminChangelogEntrySchema.parse(await data('/v1/admin/changelog', o({ method: 'POST', body: input }))),
    updateChangelog: async (id, input) =>
      adminChangelogEntrySchema.parse(await data(`/v1/admin/changelog/${encodeURIComponent(id)}`, o({ method: 'PATCH', body: input }))),
    deleteChangelog: async (id) => {
      await request(`/v1/admin/changelog/${encodeURIComponent(id)}`, o({ method: 'DELETE' }));
    },
    createTerm: async (input) =>
      taxonomyTermSchema.parse(A.fromTerm(await data<A.BeTerm>('/v1/admin/taxonomies', o({ method: 'POST', body: A.toTermBody(input) })))),
  };
}
