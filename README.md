# 콜라보 트래커 — 프론트엔드

게임 × IP 콜라보 트래커의 Next.js 프론트엔드. PRD의 M2 범위(F-01~F-08)와 디자인 초안 4개 화면(목록·상세·작품·관리자)을 구현했다.

- **Next.js 16.3** (App Router, Turbopack) · **React 19.3** · **TypeScript 7**
- **Radix Themes 3.3** (다크, indigo / slate) + Radix Icons
- **next-intl 4.14**: `/ko`, `/en` 경로
- **Zod 4.6**: API 응답·관리자 입력 검증 (`src/schema`, 나중에 `packages/schema`로 이동)
- **jose 6**: 관리자 세션 JWT

## 시작하기

```bash
corepack enable          # pnpm 12
pnpm install
cp .env.example .env.local
pnpm dev                 # http://localhost:3000/ko
```

`API_BASE_URL`을 비워 두면 **메모리 목(mock) API**로 동작한다. 목 데이터는 PRD에 나온 콜라보 3건(태고의 달인 × 자가리코, Blood Strike / WePlay × 진격의 거인)과 검수용 초안 1건뿐이고, 확인되지 않은 값은 비워 두었다. 관리자에서 수정한 내용은 서버를 재시작하면 사라진다.

개발 중에는 `ADMIN_DEV_BYPASS=1`이면 로그인 없이 `/ko/admin`에 들어갈 수 있다(production에서는 무시).

```bash
pnpm typecheck   # next typegen + tsc (TS 7)
pnpm test        # vitest: 진행 상태 계산, URL 필터, 목 API 규칙
pnpm build
```

## 화면과 기능

| 경로 | 내용 | PRD |
| --- | --- | --- |
| `/[locale]` | 목록·검색·필터(카테고리, 파트너 분류, 권역, 플랫폼, 유형, 기간, 진행 상태). 필터 상태는 URL 쿼리에 그대로 들어가 공유 가능. 상위 키를 고르면 하위 항목 포함 | F-01 |
| `/[locale]/collabs/[slug]` | 상세: 기간·진행 상태, 요약(ko/en), 참여 작품·회사(역할), 출처(확인일), 관련 콜라보. ISR | F-02 |
| `/[locale]/properties/[slug]` | 작품(게임·IP) 페이지: 연도별 타임라인, 건수, 협업 작품, 유형 분포. ISR | F-03 |
| `/[locale]/companies/[slug]` | 회사 페이지: 참여 콜라보와 역할. ISR | F-03 |
| `/[locale]/admin` | 검수 대기열 + 편집기. draft → in_review → published → archived, 발행 조건 체크리스트, 중복 후보 비교, 분류 매핑 실패 표시, `If-Match: rev` 충돌 처리 | F-04 |
| `/[locale]/admin/entities` | 작품·회사 자동완성(별칭 일치 표시), 생성·수정, 병합 | F-05 |
| `/[locale]/admin/taxonomy` | 통제 어휘 조회·추가(ko/en 라벨, 기존 표기) | F-06 |
| `/[locale]/rss.xml` | 최신 발행 콜라보 피드(ko/en 분리) | F-11 |
| `/sitemap.xml`, `/robots.txt`, OG 이미지, `/tools/game-ip-collab-tracker/*` → 301 | SEO | F-08 |

다국어(F-07): 영문 텍스트가 없으면 한국어를 보여주고 “번역 없음” 배지를, 기계 번역이면 “기계 번역” 배지를 붙인다. 관리자 화면은 운영자 전용이라 한국어만 제공한다.

모든 공개 페이지 상단에 “공개 출처 기반 · 수동 검수” 고지가 있다.

## 구조

```text
src/
  app/
    [locale]/(site)/      공개 페이지 (헤더·고지·푸터 레이아웃)
    [locale]/admin/       관리자 (login, (protected)/…, actions.ts)
    api/                  export, revalidate 웹훅, GitHub OAuth
  components/{site,collab,entity,admin}/
  i18n/                   next-intl 라우팅
  lib/
    api/                  PublicApi·AdminApi 계약, http.ts(Express), mock/
    auth/session.ts       관리자 JWT
    phase.ts filters.ts format.ts taxonomy.ts
  schema/                 Zod 스키마 (공유 대상)
messages/{ko,en}.json
```

## Express API와의 연결

브라우저는 Express를 직접 부르지 않는다. 모든 호출은 Next.js 서버(서버 컴포넌트, Server Action, Route Handler)에서 나간다.

- 공개 조회: `Authorization: Bearer $API_SERVICE_TOKEN`, 응답은 태그 캐시(`collabs`, `collab:<slug>`, `property:<slug>`, `company:<slug>`, `taxonomies`).
- 발행·수정 후 Express가 `POST /api/revalidate`를 호출한다: `Authorization: Bearer $REVALIDATE_SECRET`, 본문 `{ "tags": ["collabs", "collab:<slug>"] }`.
- 관리자: GitHub 로그인 후 발급한 JWT(HS256, `AUTH_SECRET`, `iss=collab-tracker-web`, `aud=collab-tracker-api`, `sub`=GitHub 로그인, 8시간)를 그대로 `Bearer`로 넘긴다. Express도 같은 비밀값으로 검증한다.
- 응답 형태는 `src/schema/index.ts`의 Zod 스키마가 기준이다. 응답은 `locale`에 맞춰 라벨·이름을 채우고(`fallback` 표시), 진행 상태(`phase`)를 계산해서 내려준다.

PRD의 API 표 외에 프론트엔드가 추가로 기대하는 엔드포인트:

| 메서드 | 경로 | 용도 |
| --- | --- | --- |
| GET | `/v1/sitemap` | 발행된 콜라보 slug·updatedAt, 작품·회사 slug |
| GET | `/v1/admin/collabs?status=review\|draft\|in_review\|published\|archived&origin=` | 검수 대기열 + 상태별 건수 |
| GET | `/v1/admin/collabs/:id` | 편집용 전체 문서(`unmapped`, `duplicates`, `sourceStatus` 포함) |
| GET / POST | `/v1/admin/properties`, `/v1/admin/companies` | 엔티티 목록(`?q=`)·생성 |
| POST | `/v1/admin/taxonomies` | 분류 키 추가 |

`/v1/admin/properties/:id/merge` 본문은 `{ "targetId": "…" }`이고, 경로의 `:id`(원본)가 대상에 흡수된다.

## 환경변수

`.env.example` 참고. 필수: `NEXT_PUBLIC_SITE_URL`, `API_BASE_URL`, `API_SERVICE_TOKEN`, `REVALIDATE_SECRET`, `AUTH_SECRET`(32자 이상), `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ADMIN_GITHUB_LOGINS`. 커버 이미지를 R2에서 받으면 `MEDIA_BASE_URL`.

## 알려 둘 점

- ESLint는 넣지 않았다. TypeScript 7(네이티브 컴파일러)을 typescript-eslint가 아직 지원하지 않는다. 타입 검사는 `tsc`(TS 7)와 `next build`가 맡는다.
- 상세·작품·회사 페이지는 ISR(1시간 + 태그 무효화)이라, 진행 상태(예정 → 진행 중)가 바뀌는 시점에 최대 1시간 늦게 반영될 수 있다.
- 헤더의 “작품·회사·통계” 목록 페이지와 통계 대시보드(F-12), 제보 폼(F-15)은 아직 없다. 상세 페이지의 “오류 제보” 버튼은 비활성 상태다.
