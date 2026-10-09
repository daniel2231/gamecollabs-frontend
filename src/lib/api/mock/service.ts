/**
 * Express /v1 동작을 흉내 내는 메모리 구현. 서버 재시작 시 수정 사항은 사라진다.
 * 규칙(facetKeys 펼치기, phase 계산, en→ko 대체, 중복 판정)은 PRD 그대로 따른다.
 */
import { computePhase } from '@/lib/phase';
import type {
  AdminCollab,
  AdminEntity,
  CollabDetail,
  CollabInput,
  CollabQuery,
  CollabSummary,
  CompanyDetail,
  EntityKind,
  Locale,
  PropertyDetail,
  TaxonomyTerm,
  TermRef,
  Transition,
} from '@/schema';
import { ApiError, type AdminApi, type EntityInput, type PublicApi, type QueueFilter, type TermInput } from '../types';
import * as seed from './data';
import type { DbCollab, DbCompany, DbProperty } from './data';

type Store = { terms: TaxonomyTerm[]; properties: DbProperty[]; companies: DbCompany[]; collabs: DbCollab[] };
// 개발 서버 핫 리로드에도 수정 내용이 유지되도록 전역에 둔다
const g = globalThis as { __collabTrackerMock?: Store };
const db: Store = (g.__collabTrackerMock ??= structuredClone({
  terms: seed.terms,
  properties: seed.properties,
  companies: seed.companies,
  collabs: seed.collabs,
}));

// ── 공통 도우미 ───────────────────────────────────────────────

const termByKey = () => new Map(db.terms.map((t) => [t.key, t]));

function termRef(key: string, locale: Locale): TermRef {
  const t = termByKey().get(key);
  return { key, label: t ? t.label[locale] : key };
}

function localize(name: { ko: string; en: string; original?: string | null }, locale: Locale) {
  const value = locale === 'en' && name.en ? name.en : name.ko;
  return { value, fallback: locale === 'en' && !name.en, original: name.original ?? null };
}

const propertyById = (id: string) => db.properties.find((p) => p.id === id);
const companyById = (id: string) => db.companies.find((c) => c.id === id);

/** 입력 키 + 모든 상위 키 + partner 역할 작품의 kind */
export function facetKeys(c: DbCollab): string[] {
  const map = termByKey();
  const keys = new Set<string>();
  const add = (k: string) => {
    keys.add(k);
    for (const a of map.get(k)?.ancestors ?? []) keys.add(a);
  };
  [c.category, ...c.regions, ...c.platforms, ...c.collabTypes].forEach((k) => k && add(k));
  for (const p of c.parties) {
    if (p.role === 'partner') {
      const prop = propertyById(p.propertyId);
      if (prop) add(prop.kind);
    }
  }
  return [...keys];
}

function searchHaystack(c: DbCollab): string {
  const parts = [c.slug, c.i18n.ko.title, c.i18n.en.title, c.i18n.ko.summary, c.i18n.en.summary];
  for (const p of c.parties) {
    const prop = propertyById(p.propertyId);
    if (prop) parts.push(prop.name.ko, prop.name.en, prop.name.original ?? '', ...prop.aliases);
  }
  for (const co of c.companies) {
    const comp = companyById(co.companyId);
    if (comp) parts.push(comp.name.ko, comp.name.en, comp.name.original ?? '', ...comp.aliases);
  }
  return parts.join(' ').toLowerCase();
}

function toSummary(c: DbCollab, locale: Locale): CollabSummary {
  const enTitle = c.i18n.en.title;
  return {
    slug: c.slug,
    title: locale === 'en' && enTitle ? enTitle : c.i18n.ko.title,
    fallback: locale === 'en' && !enTitle,
    phase: computePhase(c.period),
    period: c.period,
    parties: c.parties.flatMap((p) => {
      const prop = propertyById(p.propertyId);
      if (!prop) return [];
      return [{ slug: prop.slug, role: p.role, kind: termRef(prop.kind, locale), name: localize(prop.name, locale) }];
    }),
    category: c.category ? termRef(c.category, locale) : null,
    regions: c.regions.map((k) => termRef(k, locale)),
    platforms: c.platforms.map((k) => termRef(k, locale)),
    collabTypes: c.collabTypes.map((k) => termRef(k, locale)),
    cover: null,
    publishedAt: c.publishedAt,
  };
}

const published = () => db.collabs.filter((c) => c.status === 'published');

function compareStart(a: DbCollab, b: DbCollab, dir: 1 | -1): number {
  const sa = a.period.precision === 'unknown' ? null : a.period.start;
  const sb = b.period.precision === 'unknown' ? null : b.period.start;
  if (sa === sb) return b.createdAt.localeCompare(a.createdAt);
  if (!sa) return 1; // 미상은 항상 뒤로
  if (!sb) return -1;
  return dir * sa.localeCompare(sb);
}

function filterCollabs(query: CollabQuery): DbCollab[] {
  const q = query.q?.toLowerCase();
  const property = query.property ? db.properties.find((p) => p.slug === query.property) : undefined;
  const company = query.company ? db.companies.find((c) => c.slug === query.company) : undefined;
  const facets = [query.category, query.partner_category, query.region, query.platform, query.collab_type].filter(
    (list) => list.length > 0,
  );
  const result = published().filter((c) => {
    if (q && !searchHaystack(c).includes(q)) return false;
    if (query.property && !(property && c.parties.some((p) => p.propertyId === property.id))) return false;
    if (query.company && !(company && c.companies.some((co) => co.companyId === company.id))) return false;
    if (facets.length) {
      const keys = new Set(facetKeys(c));
      // 같은 필드 안에서 OR, 필드 간 AND
      if (!facets.every((list) => list.some((k) => keys.has(k)))) return false;
    }
    if (query.phase && computePhase(c.period) !== query.phase) return false;
    if (query.from || query.to) {
      if (!c.period.start || c.period.precision === 'unknown') return false;
      const month = c.period.start.slice(0, 7);
      if (query.from && month < query.from) return false;
      if (query.to && month > query.to) return false;
    }
    return true;
  });
  if (query.sort === 'recent') {
    return result.sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
  }
  return result.sort((a, b) => compareStart(a, b, query.sort === 'start_asc' ? 1 : -1));
}

const delay = () => new Promise((r) => setTimeout(r, 0));

// ── 공개 API ─────────────────────────────────────────────────

export const mockPublicApi: PublicApi = {
  async listCollabs(query, locale) {
    await delay();
    const all = filterCollabs(query);
    const offset = query.cursor ? Number(Buffer.from(query.cursor, 'base64url').toString()) || 0 : 0;
    const page = all.slice(offset, offset + query.limit);
    const next = offset + query.limit < all.length ? Buffer.from(String(offset + query.limit)).toString('base64url') : null;
    return { items: page.map((c) => toSummary(c, locale)), total: all.length, nextCursor: next };
  },

  async getCollab(slug, locale): Promise<CollabDetail | null> {
    await delay();
    const c = published().find((x) => x.slug === slug);
    if (!c) return null;
    const base = toSummary(c, locale);
    const enSummary = c.i18n.en.summary;
    const host = c.parties.find((p) => p.role === 'host')?.propertyId;
    const partner = c.parties.find((p) => p.role === 'partner')?.propertyId;
    const related = published()
      .filter((o) => o.id !== c.id)
      .flatMap<CollabDetail['related'][number]>((o) => {
        if (host && o.parties.some((p) => p.role === 'host' && p.propertyId === host))
          return [{ ...toSummary(o, locale), relation: 'same_host' as const }];
        if (partner && o.parties.some((p) => p.role === 'partner' && p.propertyId === partner))
          return [{ ...toSummary(o, locale), relation: 'same_partner' as const }];
        return [];
      })
      .slice(0, 6);
    return {
      ...base,
      summary: locale === 'en' && enSummary ? enSummary : c.i18n.ko.summary,
      summaryFallback: locale === 'en' && !enSummary,
      note: (locale === 'en' ? c.i18n.en.note : c.i18n.ko.note) || null,
      companies: c.companies.flatMap((co) => {
        const comp = companyById(co.companyId);
        return comp ? [{ slug: comp.slug, role: co.role, name: localize(comp.name, locale) }] : [];
      }),
      sources: [...c.sources].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)),
      related,
      updatedAt: c.updatedAt,
    };
  },

  async getProperty(slug, locale): Promise<PropertyDetail | null> {
    await delay();
    const p = db.properties.find((x) => x.slug === slug);
    if (!p) return null;
    const list = published()
      .filter((c) => c.parties.some((x) => x.propertyId === p.id))
      .sort((a, b) => compareStart(a, b, -1));
    const counterparts = new Map<string, { slug: string; name: string; count: number }>();
    const types = new Map<string, number>();
    for (const c of list) {
      for (const x of c.parties) {
        if (x.propertyId === p.id) continue;
        const other = propertyById(x.propertyId);
        if (!other) continue;
        const cur = counterparts.get(other.slug) ?? { slug: other.slug, name: localize(other.name, locale).value, count: 0 };
        cur.count++;
        counterparts.set(other.slug, cur);
      }
      for (const t of c.collabTypes) types.set(t, (types.get(t) ?? 0) + 1);
    }
    const parent = p.parentId ? propertyById(p.parentId) : undefined;
    const starts = list.map((c) => c.period.start).filter((s): s is string => Boolean(s));
    return {
      slug: p.slug,
      kind: termRef(p.kind, locale),
      name: localize(p.name, locale),
      nameKo: p.name.ko,
      nameEn: p.name.en || null,
      aliases: p.aliases,
      officialUrl: p.officialUrl,
      parent: parent ? { slug: parent.slug, name: localize(parent.name, locale).value } : null,
      stats: {
        collabCount: list.length,
        counterpartCount: counterparts.size,
        latestStart: starts.sort().at(-1) ?? null,
      },
      counterparts: [...counterparts.values()].sort((a, b) => b.count - a.count),
      typeDistribution: [...types.entries()]
        .map(([key, count]) => ({ ...termRef(key, locale), count }))
        .sort((a, b) => b.count - a.count),
      collabs: list.map((c) => toSummary(c, locale)),
    };
  },

  async getCompany(slug, locale): Promise<CompanyDetail | null> {
    await delay();
    const co = db.companies.find((x) => x.slug === slug);
    if (!co) return null;
    const list = published()
      .filter((c) => c.companies.some((x) => x.companyId === co.id))
      .sort((a, b) => compareStart(a, b, -1));
    const roles = new Map<string, number>();
    const props = new Map<string, { slug: string; name: string; count: number }>();
    for (const c of list) {
      for (const x of c.companies) if (x.companyId === co.id) roles.set(x.role, (roles.get(x.role) ?? 0) + 1);
      for (const x of c.parties) {
        const prop = propertyById(x.propertyId);
        if (!prop) continue;
        const cur = props.get(prop.slug) ?? { slug: prop.slug, name: localize(prop.name, locale).value, count: 0 };
        cur.count++;
        props.set(prop.slug, cur);
      }
    }
    const starts = list.map((c) => c.period.start).filter((s): s is string => Boolean(s));
    return {
      slug: co.slug,
      name: localize(co.name, locale),
      nameKo: co.name.ko,
      nameEn: co.name.en || null,
      aliases: co.aliases,
      country: co.country,
      stats: { collabCount: list.length, latestStart: starts.sort().at(-1) ?? null },
      roles: [...roles.entries()].map(([role, count]) => ({ role: role as DbCollab['companies'][number]['role'], count })),
      properties: [...props.values()].sort((a, b) => b.count - a.count),
      collabs: list.map((c) => ({
        ...toSummary(c, locale),
        companyRole: c.companies.find((x) => x.companyId === co.id)!.role,
      })),
    };
  },

  async getTaxonomies() {
    await delay();
    return db.terms.filter((t) => !t.deprecated);
  },

  async getStats() {
    await delay();
    const byPhase = { upcoming: 0, ongoing: 0, ended: 0, unknown: 0 };
    for (const c of published()) byPhase[computePhase(c.period)]++;
    return { published: published().length, byPhase };
  },


  async getSitemap() {
    await delay();
    const list = published();
    const propIds = new Set(list.flatMap((c) => c.parties.map((p) => p.propertyId)));
    const compIds = new Set(list.flatMap((c) => c.companies.map((x) => x.companyId)));
    return {
      collabs: list.map((c) => ({ slug: c.slug, updatedAt: c.updatedAt })),
      properties: db.properties.filter((p) => propIds.has(p.id)).map((p) => ({ slug: p.slug })),
      companies: db.companies.filter((c) => compIds.has(c.id)).map((c) => ({ slug: c.slug })),
    };
  },
};

// ── 관리자 API ───────────────────────────────────────────────

const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

function findDuplicates(c: DbCollab): AdminCollab['duplicates'] {
  const urls = new Set(c.sources.map((s) => s.url));
  const ids = c.parties.map((p) => p.propertyId).sort().join('|');
  const start = c.period.start ? Date.parse(c.period.start) : null;
  return db.collabs.flatMap<AdminCollab['duplicates'][number]>((o) => {
    if (o.id === c.id || o.status === 'archived') return [];
    if (o.sources.some((s) => urls.has(s.url)))
      return [{ id: o.id, slug: o.slug, title: o.i18n.ko.title, reason: 'same_source' as const }];
    const oStart = o.period.start ? Date.parse(o.period.start) : null;
    const sameParties = ids && o.parties.map((p) => p.propertyId).sort().join('|') === ids;
    if (sameParties && start !== null && oStart !== null && Math.abs(start - oStart) <= FOURTEEN_DAYS)
      return [{ id: o.id, slug: o.slug, title: o.i18n.ko.title, reason: 'same_parties_near_date' as const }];
    return [];
  });
}

function toAdmin(c: DbCollab): AdminCollab {
  return {
    id: c.id,
    slug: c.slug,
    status: c.status,
    rev: c.rev,
    i18n: {
      ko: { ...c.i18n.ko },
      en: { ...c.i18n.en },
    },
    parties: c.parties.map((p) => ({ ...p, name: null })),
    companies: c.companies,
    category: c.category,
    regions: c.regions,
    platforms: c.platforms,
    collabTypes: c.collabTypes,
    period: c.period,
    sources: c.sources.map(({ url, title, publisher, type, isPrimary, accessedAt }) => ({
      url,
      title,
      publisher,
      type,
      isPrimary,
      accessedAt,
    })),
    origin: c.origin,
    unmapped: c.unmapped,
    unmappedOther: [],
    sourceStatus: c.sources.map((s) => ({ url: s.url, httpStatus: s.httpStatus ?? null })),
    duplicates: findDuplicates(c),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function requireCollab(id: string): DbCollab {
  const c = db.collabs.find((x) => x.id === id);
  if (!c) throw new ApiError(404, 'not_found');
  return c;
}

function validateTerms(input: CollabInput) {
  const map = termByKey();
  const fields: Record<string, string> = {};
  const check = (field: string, keys: (string | null)[], taxonomy: TaxonomyTerm['taxonomy']) => {
    const bad = keys.filter((k): k is string => Boolean(k) && map.get(k!)?.taxonomy !== taxonomy);
    if (bad.length) fields[field] = `통제 어휘에 없는 키: ${bad.join(', ')}`;
  };
  check('category', [input.category], 'category');
  check('regions', input.regions, 'region');
  check('platforms', input.platforms, 'platform');
  check('collabTypes', input.collabTypes, 'collab_type');
  if (Object.keys(fields).length) throw new ApiError(422, 'validation_failed', undefined, fields);
}

/** 발행 조건: 출처 1개 이상 + 필수 필드 + 매핑 미해결 없음 */
export function publishBlockers(c: Pick<DbCollab, 'sources' | 'i18n' | 'parties' | 'period' | 'unmapped'>) {
  const fields: Record<string, string> = {};
  if (c.sources.length === 0) fields.sources = '출처가 1개 이상 필요합니다';
  if (!c.i18n.ko.title.trim()) fields['i18n.ko.title'] = '한국어 제목이 필요합니다';
  if (!c.parties.some((p) => p.role === 'host')) fields.parties = '호스트 작품이 필요합니다';
  else if (!c.parties.some((p) => p.role === 'partner')) fields.parties = '파트너 작품이 필요합니다';
  if (c.unmapped.length) fields.unmapped = '분류 매핑 미해결 항목이 있습니다';
  return fields;
}

function now() {
  return new Date().toISOString();
}

function entityList(kind: EntityKind): (DbProperty | DbCompany)[] {
  return kind === 'property' ? db.properties : db.companies;
}

function toAdminEntity(kind: EntityKind, e: DbProperty | DbCompany): AdminEntity {
  const count = db.collabs.filter(
    (c) =>
      c.status === 'published' &&
      (kind === 'property' ? c.parties.some((p) => p.propertyId === e.id) : c.companies.some((x) => x.companyId === e.id)),
  ).length;
  return {
    id: e.id,
    kind,
    slug: e.slug,
    name: e.name,
    aliases: e.aliases,
    category: 'kind' in e ? e.kind : null,
    country: 'country' in e ? e.country : null,
    collabCount: count,
  };
}

function matches(e: DbProperty | DbCompany, q: string): string | null | false {
  const needle = q.toLowerCase();
  if ([e.slug, e.name.ko, e.name.en, e.name.original ?? ''].some((v) => v.toLowerCase().includes(needle))) return null;
  const alias = e.aliases.find((a) => a.toLowerCase().includes(needle));
  return alias ?? false;
}

function assertEntityInput(kind: EntityKind, input: EntityInput, selfId?: string) {
  const fields: Record<string, string> = {};
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug)) fields.slug = 'slug는 소문자·숫자·하이픈만';
  if (entityList(kind).some((e) => e.slug === input.slug && e.id !== selfId)) fields.slug = '이미 있는 slug';
  if (!input.name.ko.trim()) fields['name.ko'] = '한국어 이름이 필요합니다';
  if (kind === 'property' && !termByKey().has(input.category ?? '')) fields.category = '분류를 선택하세요';
  if (Object.keys(fields).length) throw new ApiError(422, 'validation_failed', undefined, fields);
}

export const mockAdminApi: AdminApi = {
  async listQueue(filter: QueueFilter) {
    await delay();
    const counts = { review: 0, draft: 0, in_review: 0, published: 0, archived: 0 };
    for (const c of db.collabs) {
      counts[c.status]++;
      if (c.status === 'draft' || c.status === 'in_review') counts.review++;
    }
    const items = db.collabs
      .filter((c) =>
        filter.status === 'review' ? c.status === 'draft' || c.status === 'in_review' : c.status === filter.status,
      )
      .filter((c) => !filter.origin || c.origin.type === filter.origin)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.i18n.ko.title || c.slug,
        status: c.status,
        origin: c.origin.type,
        sourceCount: c.sources.length,
        duplicateCandidate: findDuplicates(c).length > 0,
        updatedAt: c.updatedAt,
      }));
    return { items, counts };
  },

  async getCollab(id) {
    await delay();
    const c = db.collabs.find((x) => x.id === id);
    return c ? toAdmin(c) : null;
  },

  async createCollab(input) {
    await delay();
    validateTerms(input);
    if (db.collabs.some((c) => c.slug === input.slug)) throw new ApiError(409, 'slug_taken', undefined, { slug: '이미 있는 slug' });
    const c: DbCollab = {
      id: `k_${crypto.randomUUID().slice(0, 8)}`,
      status: 'draft',
      ...structuredClone(input),
      i18n: { ko: input.i18n.ko, en: input.i18n.en },
      sources: input.sources.map((s) => ({ ...s, lastCheckedAt: null, httpStatus: null, archiveUrl: null })),
      origin: { type: 'manual', runId: null, model: null, confidence: null },
      unmapped: [],
      rev: 1,
      createdAt: now(),
      updatedAt: now(),
      publishedAt: null,
    };
    db.collabs.push(c);
    return toAdmin(c);
  },

  async updateCollab(id, input, rev) {
    await delay();
    const c = requireCollab(id);
    if (c.rev !== rev) throw new ApiError(412, 'rev_conflict', '다른 사람이 먼저 수정했습니다. 새로고침 후 다시 시도하세요.');
    validateTerms(input);
    if (db.collabs.some((o) => o.slug === input.slug && o.id !== id))
      throw new ApiError(409, 'slug_taken', undefined, { slug: '이미 있는 slug' });
    const prevUrls = new Map(c.sources.map((s) => [s.url, s]));
    Object.assign(c, {
      slug: input.slug,
      i18n: { ko: input.i18n.ko, en: input.i18n.en },
      parties: input.parties,
      companies: input.companies,
      category: input.category,
      regions: input.regions,
      platforms: input.platforms,
      collabTypes: input.collabTypes,
      period: input.period,
      sources: input.sources.map((s) => ({
        lastCheckedAt: null,
        httpStatus: null,
        archiveUrl: null,
        ...prevUrls.get(s.url),
        ...s,
      })),
      // 원본 값은 보존하되, 해당 필드를 사람이 채우면 미해결 표시를 해제한다
      unmapped: c.unmapped.filter((u) => {
        const v = input[u.field as 'platforms' | 'regions' | 'collabTypes'];
        return !(Array.isArray(v) && v.length > 0);
      }),
      rev: c.rev + 1,
      updatedAt: now(),
    });
    return toAdmin(c);
  },

  async transition(id, action: Transition) {
    await delay();
    const c = requireCollab(id);
    const allowed: Record<Transition, DbCollab['status'][]> = {
      submit: ['draft'],
      publish: ['draft', 'in_review'],
      archive: ['draft', 'in_review', 'published'],
    };
    if (!allowed[action].includes(c.status)) throw new ApiError(409, 'invalid_transition', `${c.status} → ${action} 불가`);
    if (action === 'publish') {
      const fields = publishBlockers(c);
      if (Object.keys(fields).length) throw new ApiError(422, 'validation_failed', '발행 조건을 충족하지 않습니다', fields);
      c.status = 'published';
      c.publishedAt = now();
    } else {
      c.status = action === 'submit' ? 'in_review' : 'archived';
    }
    c.rev++;
    c.updatedAt = now();
    return toAdmin(c);
  },

  async match(name) {
    await delay();
    const q = name.trim();
    if (!q) return { properties: [], companies: [] };
    const pick = (kind: EntityKind) =>
      entityList(kind).flatMap((e) => {
        const m = matches(e, q);
        return m === false ? [] : [{ ...toAdminEntity(kind, e), matchedAlias: m }];
      });
    return { properties: pick('property').slice(0, 8), companies: pick('company').slice(0, 8) };
  },

  async listEntities(kind, q) {
    await delay();
    return entityList(kind)
      .filter((e) => !q || matches(e, q) !== false)
      .map((e) => toAdminEntity(kind, e));
  },

  async createEntity(kind, input) {
    await delay();
    assertEntityInput(kind, input);
    const id = `${kind === 'property' ? 'p' : 'c'}_${crypto.randomUUID().slice(0, 8)}`;
    if (kind === 'property') {
      const p: DbProperty = { id, slug: input.slug, kind: input.category!, name: input.name, aliases: input.aliases, parentId: null, officialUrl: null };
      db.properties.push(p);
      return toAdminEntity(kind, p);
    }
    const c: DbCompany = { id, slug: input.slug, name: input.name, aliases: input.aliases, country: input.country };
    db.companies.push(c);
    return toAdminEntity(kind, c);
  },

  async updateEntity(kind, id, input) {
    await delay();
    const e = entityList(kind).find((x) => x.id === id);
    if (!e) throw new ApiError(404, 'not_found');
    assertEntityInput(kind, input, id);
    Object.assign(e, { slug: input.slug, name: input.name, aliases: input.aliases });
    if ('kind' in e && input.category) e.kind = input.category;
    if ('country' in e) e.country = input.country;
    return toAdminEntity(kind, e);
  },

  async mergeEntities(kind, sourceId, targetId) {
    await delay();
    if (sourceId === targetId) throw new ApiError(422, 'validation_failed', '같은 항목끼리는 병합할 수 없습니다');
    const list = entityList(kind);
    const source = list.find((x) => x.id === sourceId);
    const target = list.find((x) => x.id === targetId);
    if (!source || !target) throw new ApiError(404, 'not_found');
    // 원본 이름·별칭은 대상의 별칭으로 흡수 (이후 중복 감지·검색에 사용)
    const absorbed = [source.name.ko, source.name.en, source.name.original ?? '', ...source.aliases].filter(Boolean);
    target.aliases = [...new Set([...target.aliases, ...absorbed])].filter(
      (a) => a !== target.name.ko && a !== target.name.en,
    );
    for (const c of db.collabs) {
      if (kind === 'property') c.parties.forEach((p) => p.propertyId === sourceId && (p.propertyId = targetId));
      else c.companies.forEach((x) => x.companyId === sourceId && (x.companyId = targetId));
    }
    list.splice(list.indexOf(source), 1);
    return toAdminEntity(kind, target);
  },

  async createTerm(input: TermInput) {
    await delay();
    const map = termByKey();
    const fields: Record<string, string> = {};
    if (!input.key.startsWith(`${input.taxonomy}.`)) fields.key = `키는 ${input.taxonomy}. 으로 시작해야 합니다`;
    if (!/^[a-z_]+(\.[a-z0-9_]+)+$/.test(input.key)) fields.key = '소문자·숫자·밑줄과 점만 사용';
    if (map.has(input.key)) fields.key = '이미 있는 키';
    const parent = input.parent ? map.get(input.parent) : null;
    if (input.parent && (!parent || parent.taxonomy !== input.taxonomy)) fields.parent = '같은 분류의 키를 고르세요';
    if (!input.label.ko.trim() || !input.label.en.trim()) fields.label = 'ko/en 라벨이 모두 필요합니다';
    if (Object.keys(fields).length) throw new ApiError(422, 'validation_failed', undefined, fields);
    const term: TaxonomyTerm = {
      ...input,
      ancestors: parent ? [...parent.ancestors, parent.key] : [],
      order: db.terms.filter((t) => t.taxonomy === input.taxonomy).length,
      deprecated: false,
    };
    db.terms.push(term);
    return term;
  },
};
