import 'server-only';
import { z } from 'zod';
import {
  adminCollabSchema,
  adminEntitySchema,
  adminQueueItemSchema,
  collabDetailSchema,
  collabListResponseSchema,
  companyDetailSchema,
  matchResponseSchema,
  propertyDetailSchema,
  statsSchema,
  taxonomyTermSchema,
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
 * 캐시 태그: collabs, collab:<slug>, property:<slug>, company:<slug>, taxonomies
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
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...opts.headers,
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    // 공개 조회는 태그 캐시(웹훅으로 무효화), 관리자 요청은 항상 최신
    ...(isRead && !opts.token ? { next: { tags: opts.tags ?? [], revalidate: 3600 } } : { cache: 'no-store' as const }),
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
  precondition_failed: '다른 사람이 먼저 수정했습니다. 새로고침 후 다시 시도하세요.',
  invalid_transition: '현재 상태에서는 할 수 없는 작업입니다.',
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
  getStats: async () =>
    statsSchema.parse(A.toStats(await data<Parameters<typeof A.toStats>[0]>('/v1/stats', { tags: ['collabs'] }))),
  getSitemap: async () => A.toSitemap(await data<Parameters<typeof A.toSitemap>[0]>('/v1/sitemap', { tags: ['collabs'] })),
};

const entityPath = (kind: EntityKind) => (kind === 'property' ? 'properties' : 'companies');

export function createHttpAdminApi(token: string): AdminApi {
  const o = (extra: RequestOptions = {}): RequestOptions => ({ token, ...extra });
  const raw = (id: string) => data<A.BeAdminCollab>(`/v1/admin/collabs/${id}`, o());
  /** 문서 + 중복 후보를 함께 읽어 편집기 형태로 */
  const full = async (doc: A.BeAdminCollab) => {
    const duplicates = await data<A.BeDuplicate[]>(`/v1/admin/collabs/${doc.id}/duplicates`, o());
    return adminCollabSchema.parse(A.toAdminCollab(doc, duplicates));
  };
  const entity = (kind: EntityKind, e: A.BeEntityDoc) => adminEntitySchema.parse(A.fromEntityDoc(kind, e));

  return {
    listQueue: async (filter) => {
      const body = await envelope<A.BeAdminCollab[], { counts: Record<'draft' | 'in_review' | 'published' | 'archived', number> }>(
        `/v1/admin/collabs?${A.queueParams(filter)}`,
        o(),
      );
      if (!body?.meta) throw new ApiError(502, 'bad_response');
      const queue = A.toQueue(body.data, body.meta.counts);
      return { ...queue, items: z.array(adminQueueItemSchema).parse(queue.items) };
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
        properties: res.properties.map((e) => ({ ...A.fromEntitySummary('property', e), matchedAlias: null })),
        companies: res.companies.map((e) => ({ ...A.fromEntitySummary('company', e), matchedAlias: null })),
      });
    },
    listEntities: async (kind, q) => {
      const sp = new URLSearchParams({ locale: 'ko' });
      if (q) sp.set('q', q);
      const list = await data<A.BeEntitySummary[]>(`/v1/admin/${entityPath(kind)}?${sp}`, o());
      return z.array(adminEntitySchema).parse(list.map((e) => A.fromEntitySummary(kind, e)));
    },
    createEntity: async (kind, input) =>
      entity(kind, await data(`/v1/admin/${entityPath(kind)}`, o({ method: 'POST', body: A.toEntityBody(kind, input) }))),
    updateEntity: async (kind, id, input) =>
      entity(kind, await data(`/v1/admin/${entityPath(kind)}/${id}`, o({ method: 'PATCH', body: A.toEntityBody(kind, input) }))),
    // Express: :id가 남고 from이 흡수된다
    mergeEntities: async (kind, sourceId, targetId) =>
      entity(kind, await data(`/v1/admin/${entityPath(kind)}/${targetId}/merge`, o({ method: 'POST', body: { from: sourceId } }))),
    createTerm: async (input) =>
      taxonomyTermSchema.parse(A.fromTerm(await data<A.BeTerm>('/v1/admin/taxonomies', o({ method: 'POST', body: A.toTermBody(input) })))),
  };
}
