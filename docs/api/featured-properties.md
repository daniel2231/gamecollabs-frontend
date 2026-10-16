# 홈 'IP로 찾아보기' — 백엔드 작업 명세

홈에 운영자가 고른 작품(게임·IP)을 타일로 보여준다. 운영자는 관리자 작품 화면에서 노출 여부와 순서를 정하고, 필요하면 대표 이미지를 올린다.

프론트엔드는 이미 이 계약대로 구현되어 있고(`src/lib/api/http.ts`, `src/lib/api/adapt.ts`), 목 API(`src/lib/api/mock/service.ts`)가 같은 규칙으로 동작한다. 백엔드가 준비되기 전에는:

- 공개 목록이 404를 주거나 응답 형태가 다르면 홈 섹션만 숨긴다.
- 관리자 응답에 아래 필드가 없으면 편집 화면은 값을 보내지 않는다. 기존 값은 그대로 남는다.

## 1. 작품 문서 필드

| 필드 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `featuredOrder` | `number \| null` | `null` | 홈 노출 순서(1~999, 작은 수가 앞). `null`이면 노출하지 않는다. 같은 값이 여럿이면 이름순 |
| `image` | 커버와 같은 형태 `\| null` | `null` | 작품 대표 이미지. 콜라보 `cover`와 같은 구조(`storageKey`, `originalUrl`, `credit`, `alt.{ko,en}`, `width`, `height`) |

인덱스: `{ featuredOrder: 1 }` (partial, `featuredOrder`가 null이 아닌 문서만).

## 2. 공개 API

### `GET /v1/properties?featured=true&locale=ko|en`

`featuredOrder`가 있는 작품을 순서대로 준다. 발행된 콜라보가 없는 작품도 그대로 준다. 화면에서 `collabCount > 0`으로 거른다.

```json
{
  "data": [
    {
      "slug": "attack-on-titan",
      "name": "진격의 거인",
      "names": { "ko": "진격의 거인", "en": "Attack on Titan", "original": "進撃の巨人" },
      "kind": { "key": "partner_category.anime_manga", "label": "애니메이션·만화" },
      "collabCount": 12,
      "counterpartCount": 9,
      "ongoingCount": 1,
      "image": null,
      "latestCover": {
        "url": "https://media.example.com/covers/abc.webp",
        "originalUrl": null,
        "credit": "© ...",
        "alt": "…",
        "width": 1600,
        "height": 900
      }
    }
  ]
}
```

| 필드 | 계산 |
| --- | --- |
| `name` | 요청 locale의 이름 |
| `collabCount` | 이 작품이 참여한 **발행된** 콜라보 수 |
| `counterpartCount` | 그 콜라보들에서 함께 참여한 다른 작품 수(중복 제외) |
| `ongoingCount` | 그 가운데 지금 진행 중(`phase = ongoing`)인 수 |
| `image` | 작품 대표 이미지(공개 형태: `url`, `credit`, 요청 locale의 `alt`). 없으면 `null` |
| `latestCover` | 커버가 있는 발행 콜라보 가운데 시작일이 가장 최근인 것의 커버. 없으면 `null` |

`alt`가 비어 있으면 `null`로 준다. 프론트가 작품 이름으로 채운다.

## 3. 관리자 API

- 프론트는 관리자 응답에 이 필드가 있거나, 공개 `GET /v1/properties?featured=true`가 `data` 배열을 주면 백엔드가 지원한다고 본다. 둘 다 아니면 관리자 화면이 "지원하지 않음" 안내를 띄운다. 값이 없을 때도 `null`로 주는 것을 권장한다.
- **목록·검색 응답**(`GET /v1/admin/properties`, `/v1/admin/match`의 작품 항목): `featuredOrder`와 `image`를 함께 준다. `image`는 콜라보 관리자 응답의 `cover`와 같은 형태다(`storageKey`, `url?`, `originalUrl`, `credit`, `alt`, `width`, `height`).
- **생성·수정 응답**(`POST /v1/admin/properties`, `PATCH /v1/admin/properties/:id`): 저장된 문서에 두 필드를 포함한다.
- **생성·수정 본문**: 두 필드 모두 **생략 가능**하다.
  - 생략하면 기존 값을 유지한다.
  - `null`이면 노출을 해제하거나 이미지를 지운다.
  - `featuredOrder`는 1~999 정수.
  - `image`는 `storageKey`(`POST /v1/admin/media`로 올린 키)와 `originalUrl` 가운데 하나가 있어야 한다. 콜라보 커버 검증을 그대로 쓴다.
  - 오류는 기존처럼 `fields.featuredOrder`, `fields.image`로 준다.
- **병합**(`POST /v1/admin/properties/:id/merge`): 대상의 값을 유지한다. 대상에 없고 원본에만 있으면 원본 값을 옮긴다.
- 이미지 업로드는 기존 `POST /v1/admin/media`를 그대로 쓴다. 저장소 경로는 `properties/<slug>/...`를 권장한다.

## 4. 캐시 무효화

작품의 `featuredOrder` 또는 `image`가 바뀌면 revalidate 웹훅에 `featured` 태그를 보낸다.

```json
{ "tags": ["featured", "property:attack-on-titan"] }
```

콜라보 발행·수정은 지금처럼 `collabs`를 보내면 된다. 홈 노출 목록도 `collabs` 태그로 캐시하므로 함께 갱신된다.
