/**
 * Express 응답 → 화면 스키마 변환. Express는 `{ data, meta }`로 감싸고 이름을 문자열 하나로 주며
 * (한·영 모두 필수라 대체가 없다), 날짜는 정밀도에 맞춰 `YYYY-MM` 또는 `YYYY-MM-DD`로 준다.
 * 화면은 `src/schema`의 형태를 쓰므로 여기서 한 번에 맞춘다. 순수 함수만 둔다(테스트 대상).
 */
import type {
  AdminCollab,
  AdminEntity,
  AdminQueueItem,
  CollabDetail,
  CollabInput,
  CollabListResponse,
  CollabQuery,
  CollabSummary,
  CompanyDetail,
  EntityKind,
  Locale,
  Period,
  PropertyDetail,
  Stats,
  TaxonomyTerm,
  TermRef,
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

/** 관리자 목록·검색 항목 (`entitySummary`) */
export type BeEntitySummary = {
  id: string;
  slug: string;
  names: BeNames;
  kind?: Ref;
  country?: string | null;
  aliases: string[];
  collabCount: number;
};

/** 생성·수정·병합 응답은 저장된 문서 그대로다 */
export type BeEntityDoc = {
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
  origin: {
    type: AdminCollab['origin']['type'];
    runId: string | null;
    model: string | null;
    confidence: number | null;
    unmapped: Partial<Record<string, string[] | string>> | null;
  };
  duplicateCount?: number;
  createdAt: string;
  updatedAt: string;
};

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
    cover: c.cover
      ? {
          url: c.cover.url,
          originalUrl: c.cover.originalUrl ?? null,
          credit: c.cover.credit,
          alt: c.cover.alt ?? c.title,
          width: c.cover.width,
          height: c.cover.height,
        }
      : null,
    publishedAt: c.publishedAt ?? null,
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

export function toSitemap(s: { collabs: { slug: string; updatedAt: string | null }[]; properties: { slug: string }[]; companies: { slug: string }[] }): SitemapData {
  return {
    collabs: s.collabs.map((c) => ({ slug: c.slug, updatedAt: c.updatedAt ?? new Date(0).toISOString() })),
    properties: s.properties,
    companies: s.companies,
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

export function toAdminCollab(c: BeAdminCollab, duplicates: BeDuplicate[]): AdminCollab {
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
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
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
    updatedAt: c.updatedAt,
  };
}

export function queueParams(filter: QueueFilter): URLSearchParams {
  const sp = new URLSearchParams({
    status: filter.status === 'review' ? 'draft,in_review' : filter.status,
    limit: '100',
  });
  if (filter.origin) sp.set('origin', filter.origin);
  return sp;
}

export function toQueue(data: BeAdminCollab[], counts: Record<AdminCollab['status'], number>): QueueResponse {
  return { items: data.map(toQueueItem), counts: { ...counts, review: counts.draft + counts.in_review } };
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
  };
}

export function fromEntitySummary(kind: EntityKind, e: BeEntitySummary): AdminEntity {
  return {
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

export function fromEntityDoc(kind: EntityKind, e: BeEntityDoc): AdminEntity {
  return {
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
  return kind === 'property' ? { ...base, kind: input.category } : { ...base, country: input.country };
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
