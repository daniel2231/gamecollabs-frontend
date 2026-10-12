import { describe, expect, it, vi } from 'vitest';
import { indexNowKey, submitIndexNow, urlsForTags } from './indexnow';

describe('indexNowKey', () => {
  it('형식에 맞는 키만 받는다', () => {
    expect(indexNowKey({ INDEXNOW_KEY: ' abcd1234-ef ' })).toBe('abcd1234-ef');
    expect(indexNowKey({ INDEXNOW_KEY: 'short' })).toBeNull();
    expect(indexNowKey({ INDEXNOW_KEY: 'has space in it' })).toBeNull();
    expect(indexNowKey({})).toBeNull();
  });
});

describe('urlsForTags', () => {
  it('태그를 언어별 공개 URL로 바꾸고 중복을 없앤다', () => {
    expect(urlsForTags(['collabs', 'collab:a-x-b', 'collab:a-x-b', 'property:a', 'company:c', 'taxonomies'], 'https://x.test')).toEqual([
      'https://x.test/ko',
      'https://x.test/en',
      'https://x.test/ko/collabs/a-x-b',
      'https://x.test/en/collabs/a-x-b',
      'https://x.test/ko/properties/a',
      'https://x.test/en/properties/a',
      'https://x.test/ko/companies/c',
      'https://x.test/en/companies/c',
    ]);
  });
});

describe('submitIndexNow', () => {
  it('host·key·keyLocation·urlList를 보낸다', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 202 }));
    const status = await submitIndexNow(['https://x.test/ko'], { key: 'abcd1234', base: 'https://x.test' }, fetchImpl as unknown as typeof fetch);
    expect(status).toBe(202);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.indexnow.org/indexnow');
    expect(JSON.parse(init.body as string)).toEqual({
      host: 'x.test',
      key: 'abcd1234',
      keyLocation: 'https://x.test/indexnow-key.txt',
      urlList: ['https://x.test/ko'],
    });
  });

  it('URL이 없으면 보내지 않고, 네트워크 오류는 삼킨다', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('offline');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await submitIndexNow([], { key: 'abcd1234', base: 'https://x.test' }, fetchImpl as unknown as typeof fetch)).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(await submitIndexNow(['https://x.test/ko'], { key: 'abcd1234', base: 'https://x.test' }, fetchImpl as unknown as typeof fetch)).toBeNull();
    warn.mockRestore();
  });
});
