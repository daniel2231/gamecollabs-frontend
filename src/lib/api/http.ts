import 'server-only';
import { z } from 'zod';
import {
  adminCollabSchema,
  adminEntitySchema,
  adminQueueItemSchema,
  apiErrorSchema,
  collabDetailSchema,
  collabListResponseSchema,
  companyDetailSchema,
  matchResponseSchema,
  propertyDetailSchema,
  statsSchema,
  taxonomyResponseSchema,
  taxonomyTermSchema,
  type CollabQuery,
  type Locale,
} from '@/schema';
import { ApiError, type AdminApi, type PublicApi } from './types';

/**
 * Express /v1 HTTP 클라이언트. 브라우저에서는 절대 쓰지 않는다(server-only).
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
  const url = process.env.API_BASE_URL;
  if (!url) throw new Error('API_BASE_URL is not set');
  return url.replace(/\/$/, '');
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
    const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
    if (parsed.success) {
      const { code, message, fields } = parsed.data.error;
      throw new ApiError(res.status, code, message, fields);
    }
    throw new ApiError(res.status, 'http_error', `${res.status} ${res.statusText}`);
  }
  return res;
}

async function json<T>(schema: z.ZodType<T>, path: string, opts?: RequestOptions): Promise<T | null> {
  const res = await request(path, opts);
  return res ? schema.parse(await res.json()) : null;
}

async function jsonOrThrow<T>(schema: z.ZodType<T>, path: string, opts?: RequestOptions): Promise<T> {
  const result = await json(schema, path, opts);
  if (result === null) throw new ApiError(404, 'not_found');
  return result;
}

export function queryToParams(query: CollabQuery, locale: Locale): URLSearchParams {
  const sp = new URLSearchParams({ locale, sort: query.sort, limit: String(query.limit) });
  for (const key of ['q', 'phase', 'from', 'to', 'property', 'company', 'cursor'] as const) {
    const v = query[key];
    if (v) sp.set(key, v);
  }
  for (const key of ['category', 'partner_category', 'region', 'platform', 'collab_type'] as const) {
    for (const v of query[key]) sp.append(key, v);
  }
  return sp;
}

export const httpPublicApi: PublicApi = {
  listCollabs: (query, locale) =>
    jsonOrThrow(collabListResponseSchema, `/v1/collabs?${queryToParams(query, locale)}`, { tags: ['collabs'] }),
  getCollab: (slug, locale) =>
    json(collabDetailSchema, `/v1/collabs/${encodeURIComponent(slug)}?locale=${locale}`, {
      tags: ['collabs', `collab:${slug}`],
      nullOn404: true,
    }),
  getProperty: (slug, locale) =>
    json(propertyDetailSchema, `/v1/properties/${encodeURIComponent(slug)}?locale=${locale}`, {
      tags: ['collabs', `property:${slug}`],
      nullOn404: true,
    }),
  getCompany: (slug, locale) =>
    json(companyDetailSchema, `/v1/companies/${encodeURIComponent(slug)}?locale=${locale}`, {
      tags: ['collabs', `company:${slug}`],
      nullOn404: true,
    }),
  getTaxonomies: async () =>
    (await jsonOrThrow(taxonomyResponseSchema, '/v1/taxonomies', { tags: ['taxonomies'] })).terms,
  getStats: () => jsonOrThrow(statsSchema, '/v1/stats', { tags: ['collabs'] }),
  exportCsv: async (query, locale) => {
    const res = await request(`/v1/collabs/export.csv?${queryToParams(query, locale)}`, {
      tags: ['collabs'],
      headers: { Accept: 'text/csv' },
    });
    return res!.text();
  },
  getSitemap: () =>
    jsonOrThrow(
      z.object({
        collabs: z.array(z.object({ slug: z.string(), updatedAt: z.string() })),
        properties: z.array(z.object({ slug: z.string() })),
        companies: z.array(z.object({ slug: z.string() })),
      }),
      '/v1/sitemap',
      { tags: ['collabs'] },
    ),
};

const queueSchema = z.object({
  items: z.array(adminQueueItemSchema),
  counts: z.object({
    review: z.number(),
    draft: z.number(),
    in_review: z.number(),
    published: z.number(),
    archived: z.number(),
  }),
});

const entityPath = (kind: 'property' | 'company') => (kind === 'property' ? 'properties' : 'companies');

export function createHttpAdminApi(token: string): AdminApi {
  const o = (extra: RequestOptions = {}): RequestOptions => ({ token, ...extra });
  return {
    listQueue: ({ status, origin }) => {
      const sp = new URLSearchParams({ status });
      if (origin) sp.set('origin', origin);
      return jsonOrThrow(queueSchema, `/v1/admin/collabs?${sp}`, o());
    },
    getCollab: (id) => json(adminCollabSchema, `/v1/admin/collabs/${id}`, o({ nullOn404: true })),
    createCollab: (input) => jsonOrThrow(adminCollabSchema, '/v1/admin/collabs', o({ method: 'POST', body: input })),
    updateCollab: (id, input, rev) =>
      jsonOrThrow(adminCollabSchema, `/v1/admin/collabs/${id}`, {
        ...o({ method: 'PATCH', body: input }),
        headers: { 'If-Match': String(rev) },
      }),
    transition: (id, action, reason) =>
      jsonOrThrow(adminCollabSchema, `/v1/admin/collabs/${id}/transition`, o({ method: 'POST', body: { action, reason } })),
    match: (name) => jsonOrThrow(matchResponseSchema, `/v1/admin/match?name=${encodeURIComponent(name)}`, o()),
    listEntities: (kind, q) =>
      jsonOrThrow(z.array(adminEntitySchema), `/v1/admin/${entityPath(kind)}${q ? `?q=${encodeURIComponent(q)}` : ''}`, o()),
    createEntity: (kind, input) => jsonOrThrow(adminEntitySchema, `/v1/admin/${entityPath(kind)}`, o({ method: 'POST', body: input })),
    updateEntity: (kind, id, input) =>
      jsonOrThrow(adminEntitySchema, `/v1/admin/${entityPath(kind)}/${id}`, o({ method: 'PATCH', body: input })),
    mergeEntities: (kind, sourceId, targetId) =>
      jsonOrThrow(adminEntitySchema, `/v1/admin/${entityPath(kind)}/${sourceId}/merge`, o({ method: 'POST', body: { targetId } })),
    createTerm: (input) => jsonOrThrow(taxonomyTermSchema, '/v1/admin/taxonomies', o({ method: 'POST', body: input })),
  };
}
