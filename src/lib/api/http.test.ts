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

  it('백엔드에 업로드 라우트가 없으면(404) 알아보기 쉬운 오류로 바꾼다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(404, { error: { code: 'not_found' } })));
    const err = await createHttpAdminApi('token').uploadMedia(file(), { width: 1, height: 1 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 501, code: 'media_upload_unavailable' });
  });
});
