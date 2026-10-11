/** 16:9에서 많이 벗어난 커버(정사각형·세로형 등)는 잘리지 않게 통째로 보여준다 */
export function coverFit(cover: { width?: number | null; height?: number | null }): 'cover' | 'contain' {
  if (!cover.width || !cover.height) return 'cover';
  const ratio = cover.width / cover.height / (16 / 9);
  return ratio > 0.8 && ratio < 1.25 ? 'cover' : 'contain';
}

/** 업로드 전에 줄이는 크기: 긴 변 기준 */
export const COVER_MAX_EDGE = 1600;

/** 원본 크기를 긴 변 COVER_MAX_EDGE 이하로 비율을 지켜 줄인다(키우지는 않는다) */
export function fitWithin(width: number, height: number, max = COVER_MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

const decodeEntities = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const usable = (s: string | undefined | null) => {
  const v = s?.trim();
  return v && (/^https?:\/\/\S+$/i.test(v) || /^data:image\//i.test(v)) ? v : null;
};

/**
 * 다른 웹페이지에서 끌어온 이미지는 파일이 아니라 주소로 온다.
 * 링크로 감싼 이미지는 text/uri-list가 링크 주소이므로, HTML의 <img src>를 먼저 본다.
 */
export function imageUrlFromTransfer({ html, uriList, text }: { html?: string; uriList?: string; text?: string }): string | null {
  const src = html?.match(/<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const fromHtml = src ? usable(decodeEntities(src[1] ?? src[2] ?? src[3] ?? '')) : null;
  const fromList = uriList
    ?.split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('#'));
  return fromHtml ?? usable(fromList) ?? usable(text);
}
