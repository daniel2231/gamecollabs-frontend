/**
 * Express 응답 → 화면 스키마 변환. Express는 `{ data, meta }`로 감싸고 이름을 문자열 하나로 주며
 * (한·영 모두 필수라 대체가 없다), 날짜는 정밀도에 맞춰 `YYYY-MM` 또는 `YYYY-MM-DD`로 준다.
 * 화면은 `src/schema`의 형태를 쓰므로 여기서 한 번에 맞춘다. 순수 함수만 둔다(테스트 대상).
 */
import type {
  AdminCollab,
  AdminCover,
  AdminEntity,
  AdminQueueItem,
  CollabDetail,
  CollabInput,
  CollabListResponse,
  CollabQuery,
  CollabSummary,
  CompanyDetail,
  Cover,
  EntityKind,
  FeaturedProperty,
  FollowUpItem,
  FollowUpProposal,
  FollowUpState,
  Locale,
  Period,
  PropertyDetail,
  Stats,
  Submission,
  SubmissionKind,
  TaxonomyTerm,
  TermRef,
  UploadedMedia,
} from '@/schema';
import { TAXONOMIES } from '@/schema';
import type { EntityInput, QueueFilter, QueueResponse, SitemapData, TermInput } from './types';

// ── Express 응답 형태 (필요한 필드만) ─────────────────────────

type Ref = { key: string; label: string } | null;
type BePeriod = { start: string | null; end: string | null; precision: Period['precision']; endKind: Period['endKind'] };
type BeCover = {
  url: string;
  originalUrl?: string | null;
  credit: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
};

export type BeCard = {
  id: string;
  slug: string;
  title: string;
  phase: CollabSummary['phase'];
  period: BePeriod;
  category: Ref;
  parties: { id: string | null; slug: string | null; role: 'host' | 'partner'; name: string | null; kind: Ref }[];
  regions: Ref[];
  platforms: Ref[];
  collabTypes: Ref[];
  cover: BeCover | null;
  publishedAt?: string | null;
  companyRole?: CompanyDetail['collabs'][number]['companyRole'];
};

export type BeDetail = BeCard & {
  summary: string;
  note: string | null;
  companies: { id: string; slug: string | null; role: CompanyDetail['roles'][number]['role']; name: string | null }[];
  sources: {
    url: string;
    title: string | null;
    publisher: string | null;
    type: 'official' | 'press' | 'social' | 'store';
    isPrimary: boolean;
    accessedAt: string | null;
    lastCheckedAt: string | null;
  }[];
  /** 오프라인 콜라보 장소(이전 백엔드는 주지 않는다) */
  venues?: { name: string | null; address: string | null; url: string | null }[];
  related: BeCard[];
  updatedAt: string | null;
};

type BeNames = { ko: string | null; en: string | null; original: string | null };

export type BeEntityPage = {
  id: string;
  slug: string;
  name: string | null;
  names: BeNames;
  kind?: Ref;
  country?: string | null;
  officialUrl?: string | null;
  aliases: string[];
  collabCount: number;
  stats: { collabCount: number; firstStart: string | null; latestStart: string | null };
  partners: { id: string; slug: string | null; name: string | null; kind: Ref; count: number }[];
  collabs: BeCard[];
};

export type BeTaxonomyNode = { key: string; label: string; labels: { ko: string; en: string }; children: BeTaxonomyNode[] };
export type BeTaxonomyTree = Partial<Record<TaxonomyTerm['taxonomy'], BeTaxonomyNode[]>>;

/** GET /v1/properties?featured=true 항목 */
export type BeFeaturedProperty = {
  slug: string;
  name: string | null;
  names: BeNames;
  kind?: Ref;
  collabCount: number;
  counterpartCount: number;
  ongoingCount: number;
  image: BeCover | null;
  latestCover: BeCover | null;
};

/** 작품 홈 노출 필드. 백엔드가 지원하기 전에는 둘 다 없다 */
type BeFeaturedFields = { featuredOrder?: number | null; image?: BeAdminCover | null };

/** 관리자 목록·검색 항목 (`entitySummary`) */
export type BeEntitySummary = BeFeaturedFields & {
  id: string;
  slug: string;
  names: BeNames;
  kind?: Ref;
  country?: string | null;
  aliases: string[];
  collabCount: number;
};

/** 생성·수정·병합 응답은 저장된 문서 그대로다 */
export type BeEntityDoc = BeFeaturedFields & {
  _id: string;
  slug: string;
  name: BeNames;
  kind?: string;
  country?: string | null;
  aliases: string[];
  collabCount: number;
};

type BeLocaleText = { title: string; summary: string; note: string | null };

export type BeAdminCollab = {
  id: string;
  slug: string;
  status: AdminCollab['status'];
  rev: number;
  i18n: { ko: BeLocaleText; en: BeLocaleText };
  parties: { propertyId: string | null; role: 'host' | 'partner'; name: { ko: string | null; en: string | null } | null }[];
  companies: { companyId: string; role: AdminCollab['companies'][number]['role'] }[];
  category: string | null;
  regions: string[];
  platforms: string[];
  collabTypes: string[];
  period: { start: string | null; end: string | null; precision: Period['precision']; endKind: Period['endKind'] };
  sources: (BeDetail['sources'][number] & { httpStatus: number | null })[];
  venues?: { name: { ko: string | null; en: string | null }; address: string | null; url: string | null }[];
  origin: {
    type: AdminCollab['origin']['type'];
    runId: string | null;
    model: string | null;
    confidence: number | null;
    unmapped: Partial<Record<string, string[] | string>> | null;
  };
  duplicateCount?: number;
  /** 백엔드가 아직 관리자 응답에 커버를 넣지 않으면 필드 자체가 없다 */
  cover?: BeAdminCover | null;
  /** 후속 확인 상태. 이 기능 이전 백엔드는 주지 않는다 */
  followUp?: BeFollowUp | null;
  createdAt: string;
  updatedAt: string;
};

/** 재확인 제안의 기간: 입력 형태 그대로(날짜는 `YYYY-MM` 또는 `YYYY-MM-DD`, 정밀도는 없을 수 있다) */
type BePeriodInput = { start?: string | null; end?: string | null; precision?: Period['precision']; endKind?: Period['endKind'] };

export type BeFollowUpProposal = {
  changes: { period?: BePeriodInput; i18n?: { ko: { title: string; summary: string }; en: { title: string; summary: string } } };
  sources: { url: string; title?: string | null; publisher?: string | null }[];
  note: string | null;
  rev: number;
  by: string;
  at: string;
};

export type BeFollowUp = {
  reason: FollowUpState['reason'];
  nextCheckAt: string | null;
  lastCheckedAt: string | null;
  unchanged?: number;
  escalatedAt?: string | null;
  proposal: BeFollowUpProposal | null;
};

/** GET /v1/admin/followups 항목 */
export type BeFollowUpRow = {
  id: string;
  slug: string;
  status: AdminCollab['status'];
  rev: number;
  reason: FollowUpState['reason'];
  title: { ko: string | null; en: string | null };
  summary: { ko: string | null; en: string | null };
  period: { start: string | null; end: string | null; precision: Period['precision']; endKind: Period['endKind'] };
  sourceUrls: string[];
  lastCheckedAt: string | null;
  nextCheckAt: string | null;
  uncheckedRuns: number;
  escalated: boolean;
  proposal: BeFollowUpProposal | null;
};

export type BeAdminCover = {
  storageKey: string | null;
  /** 백엔드가 주면 그대로, 없으면 MEDIA_BASE_URL + storageKey로 만든다 */
  url?: string | null;
  originalUrl: string | null;
  credit: string | null;
  alt: { ko: string; en: string } | null;
  width: number | null;
  height: number | null;
  mirrorError?: string | null;
};

/** POST /v1/admin/media 응답 */
export type BeMedia = { storageKey: string; url?: string | null; width: number; height: number };

export type BeDuplicate = {
  id: string;
  slug: string;
  title: { ko: string | null; en: string | null };
  reason: 'same_source_url' | 'same_parties_and_date';
};

export type BeTerm = {
  _id: string;
  taxonomy: TaxonomyTerm['taxonomy'];
  parent: string | null;
  ancestors: string[];
  label: { ko: string; en: string };
  order: number;
  deprecated: boolean;
  legacyValues: string[];
};

// ── 공통 ─────────────────────────────────────────────────────

/** `YYYY-MM` → `YYYY-MM-01`, ISO 시각 → 날짜. 화면은 항상 `YYYY-MM-DD`를 쓴다. */
export function isoDay(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.length === 7 ? `${value}-01` : value.slice(0, 10);
}

const term = (r: Ref, fallbackKey = 'partner_category.other'): TermRef => r ?? { key: fallbackKey, label: fallbackKey };
const terms = (list: Ref[]): TermRef[] => list.filter((r): r is TermRef => r !== null);
const named = (value: string | null, original: string | null = null) => ({ value: value ?? '', fallback: false, original });

function period(p: BePeriod): Period {
  return { start: isoDay(p.start), end: isoDay(p.end), precision: p.precision, endKind: p.endKind };
}

// ── 공개 API ─────────────────────────────────────────────────

export function toSummary(c: BeCard): CollabSummary {
  return {
    slug: c.slug,
    title: c.title,
    fallback: false,
    phase: c.phase,
    period: period(c.period),
    // 발행된 콜라보는 모든 작품이 연결되어 있다. 연결 전 항목은 링크를 만들 수 없어 뺀다.
    parties: c.parties.flatMap((p) =>
      p.slug ? [{ slug: p.slug, role: p.role, kind: term(p.kind), name: named(p.name) }] : [],
    ),
    category: c.category,
    regions: terms(c.regions),
    platforms: terms(c.platforms),
    collabTypes: terms(c.collabTypes),
    cover: c.cover && toCover(c.cover, c.title),
    publishedAt: c.publishedAt ?? null,
  };
}

/** 공개 커버. 대체 텍스트가 없으면 제목(작품이면 이름)을 쓴다 */
function toCover(c: BeCover, fallbackAlt: string): Cover {
  return {
    url: c.url,
    originalUrl: c.originalUrl ?? null,
    credit: c.credit,
    alt: c.alt ?? fallbackAlt,
    width: c.width,
    height: c.height,
  };
}

export function toFeaturedProperty(p: BeFeaturedProperty): FeaturedProperty {
  const name = p.name ?? p.names.ko ?? p.names.en ?? p.slug;
  return {
    slug: p.slug,
    kind: term(p.kind ?? null),
    name: named(name, p.names.original),
    collabCount: p.collabCount,
    counterpartCount: p.counterpartCount,
    ongoingCount: p.ongoingCount,
    image: p.image && toCover(p.image, name),
    latestCover: p.latestCover && toCover(p.latestCover, name),
  };
}

export function toListResponse(data: BeCard[], meta: { total: number; nextCursor: string | null }): CollabListResponse {
  return { items: data.map(toSummary), total: meta.total, nextCursor: meta.nextCursor };
}

/** 관련 콜라보: 같은 호스트 작품을 공유하면 same_host, 아니면 같은 파트너 */
export function toDetail(d: BeDetail): CollabDetail {
  const hosts = new Set(d.parties.filter((p) => p.role === 'host' && p.id).map((p) => p.id));
  return {
    ...toSummary(d),
    summary: d.summary,
    summaryFallback: false,
    note: d.note,
    companies: d.companies.flatMap((c) => (c.slug ? [{ slug: c.slug, role: c.role, name: named(c.name) }] : [])),
    sources: [...d.sources]
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
      .map((s) => ({
        url: s.url,
        title: s.title ?? s.publisher ?? hostOf(s.url),
        publisher: s.publisher ?? hostOf(s.url),
        type: s.type,
        isPrimary: s.isPrimary,
        accessedAt: isoDay(s.accessedAt) ?? isoDay(d.updatedAt) ?? new Date().toISOString().slice(0, 10),
        lastCheckedAt: s.lastCheckedAt,
      })),
    venues: (d.venues ?? []).flatMap((v) => (v.name ? [{ name: v.name, address: v.address, url: v.url }] : [])),
    related: d.related.map((r) => ({
      ...toSummary(r),
      relation: r.parties.some((p) => p.role === 'host' && p.id && hosts.has(p.id)) ? ('same_host' as const) : ('same_partner' as const),
    })),
    updatedAt: d.updatedAt ?? new Date(0).toISOString(),
  };
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function otherName(names: BeNames) {
  return { nameKo: names.ko ?? '', nameEn: names.en };
}

function latest(collabs: BeCard[]): string | null {
  const starts = collabs.map((c) => isoDay(c.period.start)).filter((s): s is string => Boolean(s));
  return starts.sort().at(-1) ?? null;
}

export function toProperty(p: BeEntityPage): PropertyDetail {
  const types = new Map<string, TermRef & { count: number }>();
  for (const c of p.collabs)
    for (const t of terms(c.collabTypes)) {
      const cur = types.get(t.key) ?? { ...t, count: 0 };
      cur.count++;
      types.set(t.key, cur);
    }
  const counterparts = p.partners.flatMap((x) => (x.slug ? [{ slug: x.slug, name: x.name ?? x.slug, count: x.count }] : []));
  return {
    slug: p.slug,
    kind: term(p.kind ?? null),
    name: named(p.name, p.names.original),
    ...otherName(p.names),
    aliases: p.aliases,
    officialUrl: p.officialUrl ?? null,
    parent: null,
    stats: { collabCount: p.stats.collabCount, counterpartCount: counterparts.length, latestStart: latest(p.collabs) },
    counterparts,
    typeDistribution: [...types.values()].sort((a, b) => b.count - a.count),
    collabs: p.collabs.map(toSummary),
  };
}

export function toCompany(c: BeEntityPage): CompanyDetail {
  const roles = new Map<CompanyDetail['roles'][number]['role'], number>();
  const props = new Map<string, { slug: string; name: string; count: number }>();
  for (const x of c.collabs) {
    const role = x.companyRole ?? 'unspecified';
    roles.set(role, (roles.get(role) ?? 0) + 1);
    for (const p of x.parties) {
      if (!p.slug) continue;
      const cur = props.get(p.slug) ?? { slug: p.slug, name: p.name ?? p.slug, count: 0 };
      cur.count++;
      props.set(p.slug, cur);
    }
  }
  return {
    slug: c.slug,
    name: named(c.name, c.names.original),
    ...otherName(c.names),
    aliases: c.aliases,
    country: c.country ?? null,
    stats: { collabCount: c.stats.collabCount, latestStart: latest(c.collabs) },
    roles: [...roles.entries()].map(([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count),
    properties: [...props.values()].sort((a, b) => b.count - a.count),
    collabs: c.collabs.map((x) => ({ ...toSummary(x), companyRole: x.companyRole ?? 'unspecified' })),
  };
}

/** 트리 → 평면 목록. 공개 API는 사용 중인 용어만 주므로 deprecated는 항상 false다. */
export function flattenTaxonomy(tree: BeTaxonomyTree): TaxonomyTerm[] {
  const out: TaxonomyTerm[] = [];
  for (const taxonomy of TAXONOMIES) {
    let order = 0;
    const walk = (nodes: BeTaxonomyNode[], ancestors: string[]) => {
      for (const n of nodes) {
        out.push({
          key: n.key,
          taxonomy,
          parent: ancestors.at(-1) ?? null,
          ancestors,
          label: n.labels,
          order: order++,
          deprecated: false,
          legacyValues: [],
        });
        walk(n.children, [...ancestors, n.key]);
      }
    };
    walk(tree[taxonomy] ?? [], []);
  }
  return out;
}

export function toStats(s: { total: number; byPhase: Stats['byPhase'] }): Stats {
  return { published: s.total, byPhase: s.byPhase };
}

type BeSitemapEntity = { slug: string; updatedAt?: string | null };
const sitemapEntity = (e: BeSitemapEntity) => (e.updatedAt ? { slug: e.slug, updatedAt: e.updatedAt } : { slug: e.slug });

export function toSitemap(s: { collabs: { slug: string; updatedAt: string | null }[]; properties: BeSitemapEntity[]; companies: BeSitemapEntity[] }): SitemapData {
  return {
    collabs: s.collabs.map((c) => ({ slug: c.slug, updatedAt: c.updatedAt ?? new Date(0).toISOString() })),
    properties: s.properties.map(sitemapEntity),
    companies: s.companies.map(sitemapEntity),
  };
}

/** 화면 쿼리 → Express 쿼리. 월 범위(`YYYY-MM`)는 그 달의 첫날·마지막 날로 바꾼다. */
export function toListParams(query: CollabQuery, locale: Locale): URLSearchParams {
  const sp = new URLSearchParams({ locale, sort: query.sort, limit: String(query.limit) });
  for (const key of ['q', 'phase', 'property', 'company', 'cursor'] as const) {
    const v = query[key];
    if (v) sp.set(key, v);
  }
  if (query.from) sp.set('from', `${query.from}-01`);
  if (query.to) {
    const [y, m] = query.to.split('-').map(Number) as [number, number];
    sp.set('to', new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10));
  }
  for (const key of ['category', 'partner_category', 'region', 'platform', 'collab_type'] as const) {
    if (query[key].length) sp.set(key, query[key].join(','));
  }
  return sp;
}

// ── 관리자 API ───────────────────────────────────────────────

/** Express의 수집 원본 필드 → 편집기 필드 */
const UNMAPPED_FIELD: Record<string, string> = {
  region: 'regions',
  platform: 'platforms',
  collab_type: 'collabTypes',
  category: 'category',
};

/** 저장소 키 → 공개 주소. mediaBase는 MEDIA_BASE_URL(끝의 / 없이) */
export function mediaUrl(storageKey: string, mediaBase: string | null): string {
  return mediaBase ? `${mediaBase.replace(/\/$/, '')}/${storageKey.replace(/^\//, '')}` : storageKey;
}

export function toAdminCover(c: BeAdminCover, mediaBase: string | null): AdminCover {
  return {
    storageKey: c.storageKey,
    url: c.url ?? (c.storageKey ? mediaUrl(c.storageKey, mediaBase) : (c.originalUrl ?? '')),
    originalUrl: c.originalUrl,
    credit: c.credit ?? '',
    alt: { ko: c.alt?.ko ?? '', en: c.alt?.en ?? '' },
    width: c.width,
    height: c.height,
    mirrorError: c.mirrorError ?? null,
  };
}

export function fromMedia(m: BeMedia, mediaBase: string | null): UploadedMedia {
  return { storageKey: m.storageKey, url: m.url ?? mediaUrl(m.storageKey, mediaBase), width: m.width, height: m.height };
}

export function toAdminCollab(c: BeAdminCollab, duplicates: BeDuplicate[], mediaBase: string | null = null): AdminCollab {
  const text = (t: BeLocaleText) => ({ title: t.title, summary: t.summary, note: t.note ?? '' });
  const unmapped: AdminCollab['unmapped'] = [];
  const unmappedOther: AdminCollab['unmappedOther'] = [];
  for (const [field, raw] of Object.entries(c.origin.unmapped ?? {})) {
    const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const target = UNMAPPED_FIELD[field];
    for (const value of values) (target ? unmapped : unmappedOther).push({ field: target ?? field, raw: value });
  }
  return {
    id: c.id,
    slug: c.slug,
    status: c.status,
    rev: c.rev,
    i18n: { ko: text(c.i18n.ko), en: text(c.i18n.en) },
    parties: c.parties.map((p) => ({
      propertyId: p.propertyId,
      role: p.role,
      name: p.propertyId ? null : { ko: p.name?.ko ?? '', en: p.name?.en ?? '' },
    })),
    companies: c.companies,
    category: c.category,
    regions: c.regions,
    platforms: c.platforms,
    collabTypes: c.collabTypes,
    period: {
      start: isoDay(c.period.start),
      end: isoDay(c.period.end),
      precision: c.period.precision,
      endKind: c.period.endKind,
    },
    sources: c.sources.map((s) => ({
      url: s.url,
      title: s.title ?? '',
      publisher: s.publisher ?? '',
      type: s.type,
      isPrimary: s.isPrimary,
      accessedAt: isoDay(s.accessedAt) ?? isoDay(c.createdAt)!,
    })),
    origin: { type: c.origin.type, runId: c.origin.runId, model: c.origin.model, confidence: c.origin.confidence },
    unmapped,
    unmappedOther,
    sourceStatus: c.sources.map((s) => ({ url: s.url, httpStatus: s.httpStatus })),
    duplicates: duplicates.map((d) => ({
      id: d.id,
      slug: d.slug,
      title: d.title.ko ?? d.title.en ?? d.slug,
      reason: d.reason === 'same_source_url' ? ('same_source' as const) : ('same_parties_near_date' as const),
    })),
    // 필드가 없으면 undefined로 남겨, 저장할 때 커버를 건드리지 않게 한다
    cover: c.cover === undefined ? undefined : c.cover && toAdminCover(c.cover, mediaBase),
    venues: c.venues?.map((v) => ({ name: { ko: v.name.ko ?? '', en: v.name.en ?? '' }, address: v.address, url: v.url })),
    // 기능 이전 문서는 필드가 없거나 비어 있다
    followUp: c.followUp ? toFollowUpState(c.followUp) : undefined,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// ── 후속 확인 ─────────────────────────────────────────────────

/** 입력 형태의 기간 → 화면 기간. 정밀도가 없으면 백엔드처럼 날짜 길이로 정한다 */
export function fromPeriodInput(p: BePeriodInput): Period {
  const start = p.start ?? null;
  const precision = p.precision ?? (!start ? 'unknown' : start.length === 7 ? 'month' : 'day');
  return { start: isoDay(start), end: isoDay(p.end), precision, endKind: p.endKind ?? 'fixed' };
}

export function toFollowUpProposal(p: BeFollowUpProposal): FollowUpProposal {
  const text = (t: { title: string; summary: string }) => ({ title: t.title, summary: t.summary });
  return {
    period: p.changes.period ? fromPeriodInput(p.changes.period) : null,
    i18n: p.changes.i18n ? { ko: text(p.changes.i18n.ko), en: text(p.changes.i18n.en) } : null,
    sources: p.sources.map((s) => ({ url: s.url, title: s.title ?? null, publisher: s.publisher ?? null })),
    note: p.note,
    rev: p.rev,
    by: p.by,
    at: p.at,
  };
}

export function toFollowUpState(f: BeFollowUp): FollowUpState {
  return {
    reason: f.reason,
    nextCheckAt: f.nextCheckAt,
    lastCheckedAt: f.lastCheckedAt,
    unchanged: f.unchanged ?? 0,
    escalated: Boolean(f.escalatedAt),
    proposal: f.proposal ? toFollowUpProposal(f.proposal) : null,
  };
}

export function toFollowUpItem(r: BeFollowUpRow): FollowUpItem {
  return {
    id: r.id,
    slug: r.slug,
    status: r.status,
    rev: r.rev,
    title: r.title.ko || r.title.en || r.slug,
    text: {
      ko: { title: r.title.ko ?? '', summary: r.summary.ko ?? '' },
      en: { title: r.title.en ?? '', summary: r.summary.en ?? '' },
    },
    period: period(r.period),
    sourceUrls: r.sourceUrls,
    reason: r.reason,
    nextCheckAt: r.nextCheckAt,
    lastCheckedAt: r.lastCheckedAt,
    unchanged: r.uncheckedRuns,
    escalated: r.escalated,
    proposal: r.proposal ? toFollowUpProposal(r.proposal) : null,
  };
}

export function toQueueItem(c: BeAdminCollab): AdminQueueItem {
  return {
    id: c.id,
    slug: c.slug,
    title: c.i18n.ko.title || c.slug,
    status: c.status,
    origin: c.origin.type,
    sourceCount: c.sources.length,
    duplicateCandidate: (c.duplicateCount ?? 0) > 0,
    hasCover: c.cover === undefined ? null : Boolean(c.cover),
    updatedAt: c.updatedAt,
  };
}

export function queueParams(filter: QueueFilter): URLSearchParams {
  const sp = new URLSearchParams({
    status: filter.status === 'review' ? 'draft,in_review' : filter.status,
    limit: '100',
  });
  if (filter.origin) sp.set('origin', filter.origin);
  if (filter.cover) sp.set('cover', filter.cover);
  if (filter.q) sp.set('q', filter.q);
  if (filter.cursor) sp.set('cursor', filter.cursor);
  return sp;
}

export function toQueue(
  data: BeAdminCollab[],
  counts: Record<AdminCollab['status'], number>,
  filter?: QueueFilter,
  nextCursor: string | null = null,
): QueueResponse {
  const items = data.map(toQueueItem);
  return {
    nextCursor,
    // 백엔드가 cover 필터를 모르면 무시하고 다 주므로 여기서도 거른다(커버 정보가 없는 항목은 숨기지 않는다)
    items: filter?.cover === 'missing' ? items.filter((i) => i.hasCover !== true) : items,
    counts: { ...counts, review: counts.draft + counts.in_review },
  };
}

/**
 * 편집기 입력 → Express 본문. 편집기는 호스트·파트너를 하나씩만 다루므로,
 * 아직 작품에 연결되지 않은 수집 항목(`existing`의 이름만 있는 party)은 그 역할을 고르지 않았을 때 그대로 둔다.
 */
export function toCollabBody(input: CollabInput, existing?: BeAdminCollab['parties']) {
  const chosen = new Set(input.parties.map((p) => p.role));
  const keep = (existing ?? []).filter((p) => !p.propertyId && !chosen.has(p.role)).map((p) => ({ role: p.role, name: p.name }));
  const note = (s: string) => s.trim() || null;
  const p = input.period;
  return {
    slug: input.slug,
    i18n: {
      ko: { title: input.i18n.ko.title, summary: input.i18n.ko.summary, note: note(input.i18n.ko.note) },
      en: { title: input.i18n.en.title, summary: input.i18n.en.summary, note: note(input.i18n.en.note) },
    },
    parties: [...input.parties.flatMap((x) => (x.propertyId ? [{ propertyId: x.propertyId, role: x.role }] : [])), ...keep],
    companies: input.companies,
    category: input.category,
    regions: input.regions,
    platforms: input.platforms,
    collabTypes: input.collabTypes,
    period: {
      start: p.precision === 'unknown' ? null : p.precision === 'month' ? p.start?.slice(0, 7) ?? null : p.start,
      end: p.endKind !== 'fixed' || p.precision === 'unknown' ? null : p.precision === 'month' ? p.end?.slice(0, 7) ?? null : p.end,
      precision: p.precision,
      endKind: p.endKind,
    },
    sources: input.sources.map((s) => ({
      url: s.url,
      title: s.title.trim() || null,
      publisher: s.publisher.trim() || null,
      type: s.type,
      isPrimary: s.isPrimary,
      accessedAt: s.accessedAt,
    })),
    // 커버를 건드리지 않았으면 필드를 보내지 않는다(PATCH는 보낸 최상위 필드만 바꾼다)
    ...(input.cover === undefined ? {} : { cover: toCoverBody(input.cover) }),
    ...(input.venues === undefined ? {} : { venues: input.venues }),
  };
}

/** 편집기 커버 → PATCH 본문. 대체 텍스트는 한·영이 모두 있어야 보낸다 */
function toCoverBody(cover: AdminCover | null) {
  if (!cover) return null;
  const ko = cover.alt.ko.trim();
  const en = cover.alt.en.trim();
  return {
    storageKey: cover.storageKey,
    originalUrl: cover.originalUrl,
    credit: cover.credit.trim() || null,
    alt: ko && en ? { ko, en } : null,
    width: cover.width,
    height: cover.height,
  };
}

/** 작품 홈 노출 필드: 백엔드가 준 것만 옮긴다(없으면 undefined로 두어 저장할 때 건드리지 않는다) */
function featuredFields(kind: EntityKind, e: BeFeaturedFields, mediaBase: string | null): Pick<AdminEntity, 'featuredOrder' | 'image'> {
  if (kind !== 'property') return {};
  return {
    ...(e.featuredOrder === undefined ? {} : { featuredOrder: e.featuredOrder }),
    ...(e.image === undefined ? {} : { image: e.image && toAdminCover(e.image, mediaBase) }),
  };
}

export function fromEntitySummary(kind: EntityKind, e: BeEntitySummary, mediaBase: string | null = null): AdminEntity {
  return {
    ...featuredFields(kind, e, mediaBase),
    id: e.id,
    kind,
    slug: e.slug,
    name: { ko: e.names.ko ?? '', en: e.names.en ?? '', original: e.names.original },
    aliases: e.aliases,
    category: e.kind?.key ?? null,
    country: e.country ?? null,
    collabCount: e.collabCount,
  };
}

export function fromEntityDoc(kind: EntityKind, e: BeEntityDoc, mediaBase: string | null = null): AdminEntity {
  return {
    ...featuredFields(kind, e, mediaBase),
    id: String(e._id),
    kind,
    slug: e.slug,
    name: { ko: e.name.ko ?? '', en: e.name.en ?? '', original: e.name.original ?? null },
    aliases: e.aliases,
    category: e.kind ?? null,
    country: e.country ?? null,
    collabCount: e.collabCount ?? 0,
  };
}

export function toEntityBody(kind: EntityKind, input: EntityInput) {
  const base = { slug: input.slug, name: input.name, aliases: input.aliases };
  if (kind === 'company') return { ...base, country: input.country };
  return {
    ...base,
    kind: input.category,
    ...(input.featuredOrder === undefined ? {} : { featuredOrder: input.featuredOrder }),
    ...(input.image === undefined ? {} : { image: toCoverBody(input.image) }),
  };
}

export function toTermBody(input: TermInput) {
  return { key: input.key, parent: input.parent, label: input.label, legacyValues: input.legacyValues };
}

export function fromTerm(t: BeTerm): TaxonomyTerm {
  return {
    key: t._id,
    taxonomy: t.taxonomy,
    parent: t.parent,
    ancestors: t.ancestors,
    label: t.label,
    order: t.order,
    deprecated: t.deprecated,
    legacyValues: t.legacyValues,
  };
}

/** Express의 필드 오류(`{ path: string[] }`) → 화면 형식(`{ path: string }`) */
export function flattenFields(fields: Record<string, string[] | string> | undefined): Record<string, string> | undefined {
  if (!fields) return undefined;
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, Array.isArray(v) ? v.join(' ') : v]));
}

/**
 * GET /v1/admin/submissions 항목. 오류 제보(kind) 이전 백엔드는 Mongo 문서를 그대로 줘서
 * id 대신 _id만 있고 kind·collab이 없다(그때 제보는 모두 tip).
 */
export type BeSubmission = {
  id?: string;
  _id?: string;
  kind?: SubmissionKind;
  status: Submission['status'];
  url: string | null;
  note: string | null;
  locale: string | null;
  collab?: Submission['collab'];
  createdAt: string;
};

export function toSubmission(s: BeSubmission): Submission {
  return {
    id: s.id ?? s._id ?? '',
    kind: s.kind ?? 'tip',
    status: s.status,
    url: s.url ?? null,
    note: s.note ?? null,
    locale: s.locale === 'ko' || s.locale === 'en' ? s.locale : null,
    collab: s.collab ?? null,
    createdAt: s.createdAt,
  };
}

/** 종류별 미처리 건수. 백엔드가 meta.counts를 주지 않으면 받은 미처리 항목으로 센다 */
export function submissionCounts(items: Submission[], counts?: Partial<Record<SubmissionKind, number>>): Record<SubmissionKind, number> {
  const open = (kind: SubmissionKind) => items.filter((s) => s.kind === kind && s.status === 'new').length;
  return { tip: counts?.tip ?? open('tip'), correction: counts?.correction ?? open('correction') };
}
