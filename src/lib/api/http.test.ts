import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHttpAdminApi } from './http';
import { ApiError } from './types';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const file = () => new File([new Uint8Array([1, 2, 3])], 'cover.webp', { type: 'image/webp' });

describe('커버 업로드(HTTP)', () => {
  beforeEach(() => {
    vi.stubEnv('API_BASE_URL', 'https://api.example.com');
    vi.stubEnv('MEDIA_BASE_URL', 'https://media.example.com');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('multipart로 보내고, 응답에 url이 없으면 MEDIA_BASE_URL로 만든다', async () => {
    const fetchMock = vi.fn(async () => json(201, { data: { storageKey: 'covers/ab.webp', width: 1600, height: 900 } }));
    vi.stubGlobal('fetch', fetchMock);
    const media = await createHttpAdminApi('token').uploadMedia(file(), { width: 1, height: 1 });
    expect(media).toEqual({ storageKey: 'covers/ab.webp', url: 'https://media.example.com/covers/ab.webp', width: 1600, height: 900 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.example.com/v1/admin/media');
    expect(init.body).toBeInstanceOf(FormData);
    // boundary는 fetch가 붙이므로 Content-Type을 직접 넣지 않는다
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token');
  });

  it('백엔드가 url을 null로 주면(저장소 공개 주소 미설정) MEDIA_BASE_URL로 만든다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(201, { data: { storageKey: 'covers/cd.webp', url: null, width: 1200, height: 1200 } })));
    const media = await createHttpAdminApi('token').uploadMedia(file(), { width: 1, height: 1 });
    expect(media.url).toBe('https://media.example.com/covers/cd.webp');
  });

  it('업로드 거절(415 등)은 백엔드 코드·메시지를 그대로 넘긴다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(415, { error: { code: 'unsupported_media_type', message: 'only JPEG, PNG and WebP images are accepted' } })));
    const err = await createHttpAdminApi('token').uploadMedia(file(), { width: 1, height: 1 }).catch((e: unknown) => e);
    expect(err).toMatchObject({ status: 415, code: 'unsupported_media_type' });
  });

  it('백엔드에 업로드 라우트가 없으면(404) 알아보기 쉬운 오류로 바꾼다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(404, { error: { code: 'not_found' } })));
    const err = await createHttpAdminApi('token').uploadMedia(file(), { width: 1, height: 1 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 501, code: 'media_upload_unavailable' });
  });
});

describe('검수 큐: 커버 없음 필터를 백엔드가 모를 때', () => {
  const item = (id: string, hasCover: boolean) => ({
    id,
    slug: id,
    status: 'published',
    rev: 1,
    i18n: { ko: { title: id, summary: 's', note: null }, en: { title: id, summary: 's', note: null } },
    parties: [],
    companies: [],
    category: null,
    regions: [],
    platforms: [],
    collabTypes: [],
    period: { start: null, end: null, precision: 'unknown', endKind: 'tba' },
    sources: [],
    origin: { type: 'manual', runId: null, model: null, confidence: null, unmapped: null },
    cover: hasCover ? { storageKey: `covers/${id}.webp`, originalUrl: null, credit: null, alt: null, width: 1, height: 1 } : null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  });
  const counts = { draft: 0, in_review: 0, published: 250, archived: 0 };
  // 백엔드는 cover 파라미터를 무시하고 페이지마다 100건씩 준다
  const pages: Record<string, { data: unknown[]; next: string | null }> = {
    first: { data: Array.from({ length: 100 }, (_, i) => item(`a${i}`, true)), next: 'p2' },
    p2: { data: [...Array.from({ length: 98 }, (_, i) => item(`b${i}`, true)), item('nc1', false), item('nc2', false)], next: 'p3' },
    p3: { data: [item('nc3', false)], next: null },
  };

  beforeEach(() => {
    vi.stubEnv('API_BASE_URL', 'https://api.example.com');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const p = pages[new URL(url).searchParams.get('cursor') ?? 'first']!;
        return json(200, { data: p.data, meta: { counts, nextCursor: p.next } });
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('첫 페이지에 없으면 다음 페이지를 이어서 읽어 모은다', async () => {
    const q = await createHttpAdminApi('t').listQueue({ status: 'published', cover: 'missing' });
    expect(q.items.map((i) => i.id)).toEqual(['nc1', 'nc2', 'nc3']);
    expect(q.nextCursor).toBeNull();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
  });

  it('필터가 없으면 한 페이지만 읽는다', async () => {
    const q = await createHttpAdminApi('t').listQueue({ status: 'published' });
    expect(q.items).toHaveLength(100);
    expect(q.nextCursor).toBe('p2');
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });
});
