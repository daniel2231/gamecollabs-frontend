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

다국어(F-07): 모든 콜라보·작품·회사는 한국어와 영어를 모두 갖고 올라온다(백엔드가 둘 다 필수로 검증). 그래서 언어 대체나 “기계 번역” 표시는 없다. 관리자 화면은 운영자 전용이라 한국어만 제공한다.

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
- 관리자: GitHub 로그인 후 발급한 JWT(HS256, `AUTH_SECRET`, `iss=gamecollabs-web`, `aud=gamecollabs-api`, `sub`=GitHub 로그인, 8시간)를 그대로 `Bearer`로 넘긴다. Express는 같은 값인 `ADMIN_JWT_SECRET`으로 검증하고, `users` 컬렉션에 등록된 GitHub 계정만 통과시킨다(`cli create-user --github <login> --role admin`).
- Express 응답(`{ data, meta }`, 이름은 요청 언어의 문자열 하나)은 `src/lib/api/adapt.ts`가 화면 스키마(`src/schema/index.ts`)로 바꾸고, `http.ts`가 그 스키마로 다시 검증한다. 형태가 어긋나면 조용히 깨지지 않고 바로 오류가 난다.
- 수집 초안은 아직 작품에 연결되지 않은 참여자(이름만 있음)를 가질 수 있다. 편집기는 이를 안내하고, 운영자가 작품을 고르기 전까지 저장해도 수집된 이름을 그대로 보존한다.

화면이 쓰는 엔드포인트와 변환 (`adapt.ts`):

| 화면 | Express | 변환 |
| --- | --- | --- |
| 목록·RSS | `GET /v1/collabs` | 필터는 쉼표 목록, 월 범위 `YYYY-MM`은 그 달 첫날·마지막 날, `sort=recent`는 발행일순 |
| 상세 | `GET /v1/collabs/:slug` | 관련 콜라보의 `same_host`/`same_partner`는 호스트 작품 공유 여부로 판정 |
| 작품·회사 | `GET /v1/properties/:slug`, `/v1/companies/:slug` | 상대 작품·유형 분포·회사 역할은 타임라인에서 집계 |
| 필터·편집기 분류 | `GET /v1/taxonomies` | 트리 → 평면 목록 |
| 홈 요약 | `GET /v1/stats` | `total`, `byPhase` |
| sitemap | `GET /v1/sitemap` | 그대로 |
| 검수 대기열 | `GET /v1/admin/collabs?status=draft,in_review` | `meta.counts`(상태별 건수), 항목별 `duplicateCount` |
| 편집기 | `GET /v1/admin/collabs/:id` + `/duplicates` | `origin.unmapped` → 필드별 미해결 값 |
| 저장 | `POST`·`PATCH /v1/admin/collabs[/:id]` (`If-Match: <rev>`) | 빈 메모는 `null`, 월 단위 날짜는 `YYYY-MM` |
| 엔티티 | `GET /v1/admin/{properties,companies}[?q=]` | `q`가 없으면 전체 목록 |
| 병합 | `POST /v1/admin/{…}/:targetId/merge` `{ from }` | `from`(원본)이 `:targetId`에 흡수된다 |

## 환경변수

`.env.example` 참고. 백엔드(홈서버 `deploy/.env`)와 짝이 맞아야 하는 값:

| 프론트 (Vercel) | 백엔드 (`deploy/.env`) |
| --- | --- |
| `API_BASE_URL=https://api.<도메인>` (`/v1` 없이) | Cloudflare Tunnel의 api 호스트 |
| `API_SERVICE_TOKEN` | `SERVICE_TOKENS`에 들어 있는 값 하나 |
| `AUTH_SECRET` (32자 이상) | `ADMIN_JWT_SECRET` (같은 값) |
| `REVALIDATE_SECRET` | `WEB_REVALIDATE_SECRET` (같은 값), `WEB_REVALIDATE_URL=https://<사이트>/api/revalidate` |
| `MEDIA_BASE_URL` | `MEDIA_BASE_URL` (같은 값, 커버 이미지 주소) |

그 밖에 `NEXT_PUBLIC_SITE_URL`, `GITHUB_CLIENT_ID`·`GITHUB_CLIENT_SECRET`(콜백 `https://<사이트>/api/auth/github/callback`), `ADMIN_GITHUB_LOGINS`.

## 알려 둘 점

- ESLint는 넣지 않았다. TypeScript 7(네이티브 컴파일러)을 typescript-eslint가 아직 지원하지 않는다. 타입 검사는 `tsc`(TS 7)와 `next build`가 맡는다.
- 상세·작품·회사 페이지는 ISR(1시간 + 태그 무효화)이라, 진행 상태(예정 → 진행 중)가 바뀌는 시점에 최대 1시간 늦게 반영될 수 있다.
- 헤더의 “작품·회사·통계” 목록 페이지와 통계 대시보드(F-12), 제보 폼(F-15)은 아직 없다. 상세 페이지의 “오류 제보” 버튼은 비활성 상태다.
