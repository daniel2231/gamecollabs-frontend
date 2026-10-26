import { isLocale, type Locale } from './routing';

/** Accept-Language에서 q값이 가장 높은 언어의 기본 태그(`en-US` → `en`). `*`·빈 헤더면 undefined */
function topLanguage(acceptLanguage: string | null): string | undefined {
  let best: { tag: string; q: number } | undefined;
  for (const part of (acceptLanguage ?? '').split(',')) {
    const [rawTag, ...params] = part.trim().split(';');
    const tag = (rawTag ?? '').trim().toLowerCase();
    if (!tag || tag === '*') continue;
    const qParam = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    const q = qParam ? Number(qParam.slice(2)) : 1;
    if (!Number.isFinite(q) || q <= 0) continue;
    if (!best || q > best.q) best = { tag, q };
  }
  return best?.tag.split('-')[0];
}

/**
 * 접두사·쿠키가 없는 첫 방문의 언어.
 * 브라우저의 1순위 언어가 ko/en이면 그대로 따르고, 그 밖의 언어(ja, fr 등)면 접속 국가로 정한다: 한국은 ko, 그 외는 en.
 * 국가를 모르면(로컬 개발 등) undefined → next-intl 기본 감지(Accept-Language → defaultLocale)에 맡긴다.
 */
export function detectLocale(acceptLanguage: string | null, country: string | null): Locale | undefined {
  const lang = topLanguage(acceptLanguage);
  if (lang && isLocale(lang)) return lang;
  if (!country) return undefined;
  return country.toUpperCase() === 'KR' ? 'ko' : 'en';
}
