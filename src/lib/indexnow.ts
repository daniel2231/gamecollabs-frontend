import { routing } from '@/i18n/routing';

/** IndexNow 키 형식: 영문·숫자·하이픈 8~128자 */
const KEY_RE = /^[A-Za-z0-9-]{8,128}$/;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
/** 키 파일 경로. 사이트 루트에 있어야 사이트 전체 URL을 제출할 수 있다 */
export const INDEXNOW_KEY_PATH = '/indexnow-key.txt';

export function indexNowKey(env: Record<string, string | undefined> = process.env): string | null {
  const key = env.INDEXNOW_KEY?.trim();
  return key && KEY_RE.test(key) ? key : null;
}

const TAG_PATH: Record<string, string> = { collab: 'collabs', property: 'properties', company: 'companies' };

/** revalidate 태그 → 바뀐 공개 페이지 URL(언어별). `collabs`는 목록(홈)이 바뀐 것으로 본다 */
export function urlsForTags(tags: string[], base: string): string[] {
  const paths = new Set<string>();
  for (const tag of tags) {
    if (tag === 'collabs') paths.add('');
    const [kind, slug] = tag.split(':');
    if (slug && kind && TAG_PATH[kind]) paths.add(`/${TAG_PATH[kind]}/${slug}`);
  }
  return [...paths].flatMap((path) => routing.locales.map((l) => `${base}/${l}${path}`));
}

/**
 * 바뀐 URL을 IndexNow(Bing·네이버 등 참여 검색엔진이 공유)에 알린다. 실패해도 웹훅 응답에는 영향을 주지 않는다.
 * https://www.indexnow.org/documentation
 */
export async function submitIndexNow(urls: string[], { key, base }: { key: string; base: string }, fetchImpl: typeof fetch = fetch): Promise<number | null> {
  if (urls.length === 0) return null;
  try {
    const res = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(base).host, key, keyLocation: `${base}${INDEXNOW_KEY_PATH}`, urlList: urls.slice(0, 10000) }),
    });
    if (!res.ok) console.warn(`[indexnow] ${res.status} for ${urls.length} urls`);
    return res.status;
  } catch (err) {
    console.warn('[indexnow] request failed', err);
    return null;
  }
}
