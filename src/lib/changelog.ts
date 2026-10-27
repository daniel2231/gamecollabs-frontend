/** 공개 변경 내역 페이지 경로(언어 접두어 제외) */
export const CHANGELOG_PATH = '/changelog';

/** 버전별 링크용 id: 1.4.0 → v1-4-0, v2 → v2 */
export function versionAnchor(version: string): string {
  const slug = version.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug.startsWith('v') ? slug : `v${slug}`;
}
