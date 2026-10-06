/**
 * 개발용 목(mock) 데이터. API_BASE_URL이 없을 때만 쓰인다.
 *
 * 실제 이름은 PRD에 나온 콜라보(태고의 달인 × 자가리코, 진격의 거인 × Blood Strike / WePlay)만 사용했다.
 * 확인되지 않은 날짜·분류·출처는 비워 두거나 example.com 자리표시자로 두었다. 실제 데이터로 쓰지 말 것.
 */
import type { CollabStatus, CompanyRole, Origin, Period, Source, TaxonomyTerm } from '@/schema';

type TermSeed = [key: string, ko: string, en: string, legacy?: string[]];

function buildTerms(taxonomy: TaxonomyTerm['taxonomy'], seeds: TermSeed[]): TaxonomyTerm[] {
  return seeds.map(([key, ko, en, legacy = []], i) => {
    const segments = key.split('.');
    // 키 구조: <taxonomy>.<a>[.<b>] — 3단계 이상이면 바로 위 키가 부모
    const parents: string[] = [];
    for (let n = 2; n < segments.length; n++) parents.push(segments.slice(0, n).join('.'));
    return {
      key,
      taxonomy,
      parent: parents.at(-1) ?? null,
      ancestors: parents,
      label: { ko, en },
      order: i,
      deprecated: false,
      legacyValues: legacy,
    };
  });
}

export const terms: TaxonomyTerm[] = [
  ...buildTerms('category', [
    ['category.in_game', '게임 내', 'In-game'],
    ['category.offline', '오프라인', 'Offline'],
    ['category.merchandise', '상품', 'Merchandise'],
  ]),
  ...buildTerms('partner_category', [
    ['partner_category.anime_manga', '애니메이션·만화', 'Anime & Manga', ['Anime / Manga']],
    ['partner_category.film_tv', '영화·TV', 'Film & TV', ['Film / TV', 'Movie / TV']],
    ['partner_category.vtuber', 'VTuber', 'VTuber', ['VTuber', 'VTuber / Creator']],
    ['partner_category.music', '음악·아티스트', 'Music & Artists', ['Music', 'Music / Artist']],
    ['partner_category.game', '게임', 'Game', ['Game']],
    ['partner_category.brand', '식품·브랜드', 'Food & Brands', ['Brand']],
  ]),
  ...buildTerms('region', [
    ['region.global', '글로벌', 'Global', ['Global']],
    ['region.japan', '일본', 'Japan', ['Japan']],
    ['region.korea', '한국', 'Korea', ['Korea', 'South Korea']],
    ['region.north_america', '북미', 'North America', ['North America']],
    ['region.north_america.us', '미국', 'United States', ['United States']],
    ['region.north_america.ca', '캐나다', 'Canada', ['Canada']],
  ]),
  ...buildTerms('platform', [
    ['platform.mobile', '모바일', 'Mobile', ['Mobile']],
    ['platform.mobile.android', 'Android', 'Android', ['Android']],
    ['platform.mobile.ios', 'iOS', 'iOS', ['iOS']],
    ['platform.pc', 'PC', 'PC', ['PC']],
    ['platform.console', '콘솔', 'Console', ['Console']],
    ['platform.console.playstation', 'PlayStation', 'PlayStation', ['PlayStation']],
    ['platform.console.switch', 'Nintendo Switch', 'Nintendo Switch', ['Switch']],
  ]),
  ...buildTerms('collab_type', [
    ['collab_type.in_game_reward', '인게임 보상', 'In-game reward', ['In-Game Item', 'In-Game Reward']],
    ['collab_type.map_stage', '맵·스테이지', 'Map & stage', ['Map', 'Map / Stage']],
    ['collab_type.live_event', '라이브 이벤트', 'Live event', ['Live Event']],
    ['collab_type.character_skin', '캐릭터·스킨', 'Character & skin', ['Skin', 'Character']],
    ['collab_type.music_track', '수록곡', 'Music track', ['Song']],
  ]),
];

export type DbProperty = {
  id: string;
  slug: string;
  kind: string;
  name: { ko: string; en: string; original: string | null };
  aliases: string[];
  parentId: string | null;
  officialUrl: string | null;
};

export type DbCompany = {
  id: string;
  slug: string;
  name: { ko: string; en: string; original: string | null };
  aliases: string[];
  country: string | null;
};

export type DbCollab = {
  id: string;
  slug: string;
  status: CollabStatus;
  i18n: {
    ko: { title: string; summary: string; note: string };
    en: { title: string; summary: string; note: string; machineTranslated: boolean };
  };
  parties: { propertyId: string; role: 'host' | 'partner' }[];
  companies: { companyId: string; role: CompanyRole }[];
  category: string | null;
  regions: string[];
  platforms: string[];
  collabTypes: string[];
  period: Period;
  sources: Source[];
  origin: Origin;
  unmapped: { field: string; raw: string }[];
  rev: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export const properties: DbProperty[] = [
  {
    id: 'p_taiko',
    slug: 'taiko-no-tatsujin',
    kind: 'partner_category.game',
    name: { ko: '태고의 달인', en: 'Taiko no Tatsujin', original: '太鼓の達人' },
    aliases: [],
    parentId: null,
    officialUrl: null,
  },
  {
    id: 'p_jagariko',
    slug: 'jagariko',
    kind: 'partner_category.brand',
    name: { ko: '자가리코', en: 'Jagariko', original: 'じゃがりこ' },
    aliases: [],
    parentId: null,
    officialUrl: null,
  },
  {
    id: 'p_aot',
    slug: 'attack-on-titan',
    kind: 'partner_category.anime_manga',
    name: { ko: '진격의 거인', en: 'Attack on Titan', original: '進撃の巨人' },
    aliases: ['Shingeki no Kyojin', 'AoT'],
    parentId: null,
    officialUrl: null,
  },
  {
    id: 'p_bloodstrike',
    slug: 'blood-strike',
    kind: 'partner_category.game',
    name: { ko: 'Blood Strike', en: 'Blood Strike', original: null },
    aliases: [],
    parentId: null,
    officialUrl: null,
  },
  {
    id: 'p_weplay',
    slug: 'weplay',
    kind: 'partner_category.game',
    name: { ko: 'WePlay', en: 'WePlay', original: null },
    aliases: [],
    parentId: null,
    officialUrl: null,
  },
];

export const companies: DbCompany[] = [
  {
    id: 'c_bandai',
    slug: 'bandai-namco-entertainment',
    name: { ko: '반다이남코 엔터테인먼트', en: 'Bandai Namco Entertainment', original: 'バンダイナムコエンターテインメント' },
    aliases: ['Bandai Namco', 'BNE'],
    country: 'JP',
  },
  {
    id: 'c_calbee',
    slug: 'calbee',
    name: { ko: '가루비', en: 'Calbee', original: 'カルビー' },
    aliases: [],
    country: 'JP',
  },
];

const placeholderSource = (slug: string): Source => ({
  url: `https://example.com/placeholder/${slug}`,
  title: '[출처 제목 — 목 데이터]',
  publisher: '[발행처]',
  type: 'official',
  isPrimary: true,
  accessedAt: '2026-10-06',
  lastCheckedAt: null,
  httpStatus: null,
  archiveUrl: null,
});

const migration: Origin = { type: 'migration', runId: null, model: null, confidence: null };
const unknownPeriod: Period = { start: null, end: null, precision: 'unknown', endKind: 'tba' };

export const collabs: DbCollab[] = [
  {
    id: 'k_taiko_jagariko',
    slug: 'taiko-no-tatsujin-jagariko-2026-10',
    status: 'published',
    i18n: {
      ko: { title: '태고의 달인 × 자가리코', summary: '', note: '' },
      en: { title: 'Taiko no Tatsujin × Jagariko', summary: '', note: '', machineTranslated: false },
    },
    parties: [
      { propertyId: 'p_taiko', role: 'host' },
      { propertyId: 'p_jagariko', role: 'partner' },
    ],
    companies: [
      { companyId: 'c_bandai', role: 'publisher' },
      { companyId: 'c_calbee', role: 'brand_partner' },
    ],
    category: null,
    regions: ['region.japan'],
    platforms: [],
    collabTypes: [],
    period: { start: '2026-10-01', end: null, precision: 'month', endKind: 'tba' },
    sources: [placeholderSource('taiko-no-tatsujin-jagariko-2026-10')],
    origin: migration,
    unmapped: [],
    rev: 1,
    createdAt: '2026-10-06T00:00:00.000Z',
    updatedAt: '2026-10-06T00:00:00.000Z',
    publishedAt: '2026-10-06T00:00:00.000Z',
  },
  {
    id: 'k_bloodstrike_aot',
    slug: 'blood-strike-attack-on-titan',
    status: 'published',
    i18n: {
      ko: { title: 'Blood Strike × 진격의 거인', summary: '', note: '' },
      en: { title: '', summary: '', note: '', machineTranslated: false },
    },
    parties: [
      { propertyId: 'p_bloodstrike', role: 'host' },
      { propertyId: 'p_aot', role: 'partner' },
    ],
    companies: [],
    category: null,
    regions: [],
    platforms: [],
    collabTypes: [],
    period: unknownPeriod,
    sources: [placeholderSource('blood-strike-attack-on-titan')],
    origin: migration,
    unmapped: [],
    rev: 1,
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    publishedAt: '2026-10-05T00:00:00.000Z',
  },
  {
    id: 'k_weplay_aot',
    slug: 'weplay-attack-on-titan',
    status: 'published',
    i18n: {
      ko: { title: 'WePlay × 진격의 거인', summary: '', note: '' },
      en: { title: '', summary: '', note: '', machineTranslated: false },
    },
    parties: [
      { propertyId: 'p_weplay', role: 'host' },
      { propertyId: 'p_aot', role: 'partner' },
    ],
    companies: [],
    category: null,
    regions: [],
    platforms: [],
    collabTypes: [],
    period: unknownPeriod,
    sources: [placeholderSource('weplay-attack-on-titan')],
    origin: migration,
    unmapped: [],
    rev: 1,
    createdAt: '2026-10-04T00:00:00.000Z',
    updatedAt: '2026-10-04T00:00:00.000Z',
    publishedAt: '2026-10-04T00:00:00.000Z',
  },
  {
    // 관리자 검수 화면 확인용 초안. GPT 수집 + 분류 매핑 실패 + 중복 후보 상황을 재현한다.
    id: 'k_draft_sample',
    slug: 'sample-draft-attack-on-titan',
    status: 'draft',
    i18n: {
      ko: { title: '[게임명] × 진격의 거인', summary: '', note: '' },
      en: { title: '', summary: '', note: '', machineTranslated: false },
    },
    parties: [{ propertyId: 'p_aot', role: 'partner' }],
    companies: [],
    category: null,
    regions: [],
    platforms: [],
    collabTypes: [],
    period: unknownPeriod,
    sources: [placeholderSource('weplay-attack-on-titan')],
    origin: { type: 'gpt', runId: 'run_sample', model: null, confidence: null },
    unmapped: [{ field: 'platforms', raw: '[원본 표기]' }],
    rev: 3,
    createdAt: '2026-10-06T00:00:00.000Z',
    updatedAt: '2026-10-06T00:00:00.000Z',
    publishedAt: null,
  },
];
