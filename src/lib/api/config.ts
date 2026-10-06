/**
 * API 연결 설정의 단일 출처. 모듈 로드 시점이 아니라 호출 시점에 읽어서,
 * 빌드와 런타임의 환경변수가 달라도 목/실제 API 판단과 실제 요청 주소가 어긋나지 않게 한다.
 * API_BASE_URL이 비어 있으면(공백 포함) 목 데이터를 쓴다.
 */
export function apiBaseUrl(): string | null {
  const url = process.env.API_BASE_URL?.trim();
  return url ? url.replace(/\/$/, '') : null;
}

export function isMockApi(): boolean {
  return apiBaseUrl() === null;
}
