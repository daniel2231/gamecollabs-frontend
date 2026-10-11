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
