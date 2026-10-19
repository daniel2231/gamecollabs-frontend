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

`API_BASE_URL`을 비워 두면 **메모리 목(mock) API**로 동작한다. 목 데이터는 PRD에 나온 콜라보 3건(태고의 달인 × 자가리코, Blood Strike / WePlay × 진격의 거인)과 검수용 초안 1건뿐이고, 확인되지 않은 값은 비워 두었다. 관리자에서 수정한 내용은 서버를 재시작하면 사라진다. `MOCK_LATENCY_MS=800`처럼 지정하면 목 API 호출마다 그만큼 지연을 넣어, 로딩·대기 화면을 실제 API와 비슷하게 확인할 수 있다. `MOCK_QUEUE_PAGE_SIZE=1`처럼 검수 큐 한 페이지 크기(기본 100, 백엔드와 같음)를 줄이면 “더 보기”를 확인할 수 있다.

개발 중에는 `ADMIN_DEV_BYPASS=1`이면 로그인 없이 `/ko/admin`에 들어갈 수 있다(production에서는 무시).

```bash
pnpm typecheck   # next typegen + tsc (TS 7)
pnpm test        # vitest: 진행 상태 계산, URL 필터, 목 API 규칙
pnpm build
```

## 화면과 기능

| 경로 | 내용 | PRD |
| --- | --- | --- |
| `/[locale]` | 홈: 현황 한 줄(등록된 콜라보 전체 수, 진행 중·예정·종료 수) → 대표 콜라보 큰 카드와 진행 중 번호 목록 → IP로 찾아보기(관리자가 고른 작품 타일) → 새로 등록됨 카드(위에 나온 콜라보 제외) → 일정표(곧 시작·곧 종료). 옛 목록 주소(`/[locale]?필터…`)는 `/[locale]/collabs`로 301 | — |
| `/[locale]/collabs` | 목록·검색·필터(카테고리, 파트너 분류, 권역, 플랫폼, 유형, 기간, 진행 상태). 필터 상태는 URL 쿼리에 그대로 들어가 공유 가능. 상위 키를 고르면 하위 항목 포함. 필터를 하나만 건 목록(진행 상태 하나 또는 분류 항목 하나, 결과 1건 이상)은 랜딩 페이지로 색인하고 sitemap에 넣는다. 그 외 필터 조합은 noindex | F-01 |
| `/[locale]/collabs/[slug]` | 상세: 기간·진행 상태, 요약(ko/en), 참여 작품·회사(역할), 출처(확인일), 관련 콜라보. ISR | F-02 |
| `/[locale]/properties/[slug]` | 작품(게임·IP) 페이지: 연도별 타임라인, 건수, 협업 작품, 유형 분포. ISR | F-03 |
| `/[locale]/companies/[slug]` | 회사 페이지: 참여 콜라보와 역할. ISR | F-03 |
| `/[locale]/admin` | 검수 대기열 + 편집기. draft → in_review → published → archived, 발행 조건 체크리스트, 중복 후보 비교, 분류 매핑 실패 표시, `If-Match: rev` 충돌 처리 | F-04 |
| `/[locale]/admin/entities` | 작품·회사 자동완성(별칭 일치 표시), 생성·수정, 병합. 작품은 홈 ‘IP로 찾아보기’ 노출 순서와 대표 이미지를 정한다(백엔드 명세: [docs/api/featured-properties.md](docs/api/featured-properties.md)) | F-05 |
| `/[locale]/admin/taxonomy` | 통제 어휘 조회·추가(ko/en 라벨, 기존 표기) | F-06 |
| `/[locale]/report` | 콜라보 제보: 아직 없는 콜라보의 출처 링크(필수)와 메모. 상세 페이지의 “오류 제보” 버튼은 같은 폼을 대화상자로 열어 그 콜라보의 틀린 내용(필수)과 근거 링크를 받는다. 푸터에서 연결, noindex | F-15 |
| `/[locale]/admin/submissions` | 제보 큐: 미처리·반영함·버림, 오류 제보/새 콜라보로 거르기. 오류 제보는 편집기에서 고친 뒤 “반영함”, 새 콜라보는 등록한 뒤 “반영함”. 메뉴에 미처리 건수 | F-15 |
| `/[locale]/rss.xml` | 최신 발행 콜라보 피드(ko/en 분리) | F-11 |
| `/sitemap.xml`, `/robots.txt`, OG 이미지, `/tools/game-ip-collab-tracker/*` → 301 | SEO | F-08 |

다국어(F-07): 모든 콜라보·작품·회사는 한국어와 영어를 모두 갖고 올라온다(백엔드가 둘 다 필수로 검증). 그래서 언어 대체나 “기계 번역” 표시는 없다. 관리자 화면은 운영자 전용이라 한국어만 제공한다.

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

- 공개 조회: `Authorization: Bearer $API_SERVICE_TOKEN`, 응답은 태그 캐시(`collabs`, `collab:<slug>`, `property:<slug>`, `company:<slug>`, `taxonomies`, 홈 노출 작품은 `featured`).
- 발행·수정 후 Express가 `POST /api/revalidate`를 호출한다: `Authorization: Bearer $REVALIDATE_SECRET`, 본문 `{ "tags": ["collabs", "collab:<slug>"] }`. 작품의 홈 노출 순서·대표 이미지를 바꾸면 `featured`를 보낸다.
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
| 홈 IP로 찾아보기 | `GET /v1/properties?featured=true` (예정, [명세](docs/api/featured-properties.md)) | 대체 텍스트가 없으면 작품 이름. 404·형태 불일치면 섹션을 숨긴다 |
| sitemap | `GET /v1/sitemap` | 그대로 |
| 검수 대기열 | `GET /v1/admin/collabs?status=draft,in_review[&cover=missing]` | `meta.counts`(상태별 건수), 항목별 `duplicateCount`. `cover=missing`(커버 없음만)을 백엔드가 모르면 받은 100건 안에서 프론트가 거른다 |
| 편집기 | `GET /v1/admin/collabs/:id` + `/duplicates` | `origin.unmapped` → 필드별 미해결 값 |
| 저장 | `POST`·`PATCH /v1/admin/collabs[/:id]` (`If-Match: <rev>`) | 빈 메모는 `null`, 월 단위 날짜는 `YYYY-MM` |
| 엔티티 | `GET /v1/admin/{properties,companies}[?q=]` | `q`가 없으면 전체 목록 |
| 병합 | `POST /v1/admin/{…}/:targetId/merge` `{ from }` | `from`(원본)이 `:targetId`에 흡수된다 |
| 커버 업로드 | `POST /v1/admin/media` (multipart, `file`) | 응답 `url`이 없으면(`null`) `MEDIA_BASE_URL` + `storageKey` |
| 제보 | `POST /v1/submissions` (서비스 토큰, `X-Client-IP`) | `kind: tip`(`url` 필수) 또는 `correction`(`collab` slug, 5자 이상 `note`). 429·`bot_check_failed`·404는 폼에 안내 문구로 |
| 제보 큐 | `GET /v1/admin/submissions?status=&kind=`, `PATCH …/:id { status }` | `meta.counts`(종류별 미처리 수)가 없으면 받은 항목으로 센다. `kind`가 없는 이전 문서는 tip |

### 커버 이미지 업로드

편집기의 “커버 이미지”에서 끌어다 놓기·클릭·붙여넣기로 올린다. 브라우저가 긴 변 1600px 이하 WebP(안 되면 JPEG)로 줄인 뒤
`POST /api/admin/media`(Next Route Handler, 세션·Origin·파일 형식·4MB 확인)로 보내고, 여기서 관리자 JWT를 붙여 Express로 넘긴다.
관리자 토큰이 httpOnly 쿠키라 브라우저가 Express로 직접 보낼 수 없어서다. 목 모드에서는 메모리에 data: 주소로 둔다.

Express(`gamecollabs-backend`의 `POST /v1/admin/media`)가 형식 확인(JPEG·PNG·WebP, 5MB, 4천만 픽셀), `sharp` 재인코딩(메타데이터 제거,
긴 변 1600px, WebP), `covers/<sha256>.webp` 저장을 맡고 `{ storageKey, url, width, height }`를 돌려준다. 편집기는 저장할 때
`PATCH`의 `cover`로 연결하고, 7일 넘게 어느 콜라보도 쓰지 않는 업로드는 백엔드 주간 작업이 지운다.

- 다른 웹페이지의 이미지를 끌어다 놓으면 브라우저에는 파일이 아니라 주소만 온다(다른 사이트 이미지는 CORS 때문에 읽을 수도 없다).
  이때는 `<img src>`(링크로 감싼 이미지면 링크가 아니라 이미지) 주소를 `originalUrl`로 두고 미리 보기만 하며, 저장 직후
  `POST /v1/admin/collabs/:id/cover/mirror`로 백엔드가 우리 저장소로 복사한다(백엔드의 `safeFetch`가 사설 주소 등을 막는다).
  복사에 실패하면 원본 링크로 저장된 채 편집기에 이유가 보이고, 백엔드 시간별 `mirror-covers` 작업도 다시 시도한다.
- 관리자 조회 응답에 `cover` 필드가 없으면(이전 백엔드) 편집기는 현재 커버를 “모름”으로 보고, 사용자가 커버를 건드리지 않는 한
  저장 본문에서 `cover`를 빼서 기존 값을 지우지 않는다.
- 업로드 라우트가 없으면(404·405) 편집기에 “업로드 API가 아직 없습니다”로 보인다.
- 저장소가 설정되지 않은 백엔드는 503(`storage_unavailable`)을 준다.

## 환경변수

`.env.example` 참고. 백엔드(홈서버 `deploy/.env`)와 짝이 맞아야 하는 값:

| 프론트 (Vercel) | 백엔드 (`deploy/.env`) |
| --- | --- |
| `API_BASE_URL=https://api.<도메인>` (`/v1` 없이) | Cloudflare Tunnel의 api 호스트 |
| `API_SERVICE_TOKEN` | `SERVICE_TOKENS`에 들어 있는 값 하나 |
| `AUTH_SECRET` (32자 이상) | `ADMIN_JWT_SECRET` (같은 값) |
| `REVALIDATE_SECRET` | `WEB_REVALIDATE_SECRET` (같은 값), `WEB_REVALIDATE_URL=https://<사이트>/api/revalidate` |
| `MEDIA_BASE_URL` | `MEDIA_BASE_URL` (같은 값, 커버 이미지 주소) |

제보 폼의 Cloudflare Turnstile은 백엔드에 `TURNSTILE_SECRET`을 넣었을 때 프론트에 짝이 되는 사이트 키 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`를 넣으면 켜진다(빌드 때 들어가므로 바꾸면 다시 배포). 둘 다 비우면 honeypot과 IP당 시간당 10건 제한만 쓴다.

## 제보 (F-15)

방문자는 두 가지를 보낼 수 있다. 이름·연락처는 받지 않는다.

- **새 콜라보** (`/[locale]/report`): 출처 링크(필수)와 메모.
- **오류 제보** (상세 페이지 “오류 제보” 버튼): 발행된 콜라보에서 틀린 내용(5자 이상, 필수)과 근거 링크(선택).

폼은 서버 액션(`src/app/[locale]/(site)/actions.ts`)으로 보내고, 서버 액션이 입력을 다시 검증한 뒤 서비스 토큰과 방문자 IP(`X-Forwarded-For`의 첫 값 → `X-Client-IP`)를 붙여 Express로 넘긴다. 봇 거르기는 숨은 `website` 칸(채워져 있으면 받은 척하고 버림), 백엔드의 IP당 시간당 10건 제한, 설정했을 때 Turnstile. 아직 열린 같은 제보(같은 URL, 같은 콜라보·같은 내용)는 한 번만 쌓인다. 운영자는 `/admin/submissions`에서 처리한다. 목 모드에서도 같은 규칙으로 메모리에 쌓인다.

그 밖에 `NEXT_PUBLIC_SITE_URL`, `GITHUB_CLIENT_ID`·`GITHUB_CLIENT_SECRET`(콜백 `https://<사이트>/api/auth/github/callback`), `ADMIN_GITHUB_LOGINS`.

## 알려 둘 점

- ESLint는 넣지 않았다. TypeScript 7(네이티브 컴파일러)을 typescript-eslint가 아직 지원하지 않는다. 타입 검사는 `tsc`(TS 7)와 `next build`가 맡는다.
- 상세·작품·회사 페이지는 ISR(1시간 + 태그 무효화)이라, 진행 상태(예정 → 진행 중)가 바뀌는 시점에 최대 1시간 늦게 반영될 수 있다.
- 헤더의 “작품·회사·통계” 목록 페이지와 통계 대시보드(F-12)는 아직 없다.
