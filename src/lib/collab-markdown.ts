import type { CollabDetail, CompanyRole, PartyRef, SourceType } from '@/schema';

/** 화면 문구(언어별 메시지)를 그대로 받는다. 마크다운 사본은 HTML 페이지와 같은 낱말을 쓴다 */
export type CollabMarkdownText = {
  /** 진행 상태(진행 중·예정·종료, 조건부 종료 추정이면 '종료(추정)') */
  phase: string;
  /** 화면과 같은 시작·종료 표기 */
  start: string;
  end: string;
  labels: {
    start: string;
    end: string;
    status: string;
    summary: string;
    classification: string;
    category: string;
    partner: string;
    region: string;
    platform: string;
    type: string;
    venues: string;
    parties: string;
    companies: string;
    sources: string;
    related: string;
    primary: string;
    archived: string;
    accessed: string;
    updated: string;
    page: string;
    note: string;
  };
  partyRole: (role: PartyRef['role']) => string;
  companyRole: (role: CompanyRole) => string;
  sourceType: (type: SourceType) => string;
  relation: (relation: 'same_host' | 'same_partner') => string;
  /** 관련 콜라보 기간 표기 */
  period: (r: CollabDetail['related'][number]) => string;
};

/** 링크 글자 안의 대괄호가 링크 문법을 깨지 않도록 */
const label = (s: string) => s.replace(/([[\]\\])/g, '\\$1');
const link = (text: string, url: string) => `[${label(text)}](${url.replace(/[()\s]/g, encodeURIComponent)})`;

/**
 * 콜라보 상세 페이지의 마크다운 사본(`/{locale}/collabs/{slug}.md`).
 * AI 검색·에이전트가 레이아웃 없이 핵심 사실(기간, 참여 작품·회사, 출처)을 바로 읽도록 페이지와 같은 내용만 담는다.
 * base는 절대 주소 접두사(siteUrl), locale은 링크 언어
 */
export function collabMarkdown(collab: CollabDetail, { base, locale, text }: { base: string; locale: string; text: CollabMarkdownText }): string {
  const L = text.labels;
  const page = (path: string) => `${base}/${locale}${path}`;
  const url = page(`/collabs/${collab.slug}`);
  const partner = collab.parties.find((p) => p.role === 'partner');
  const out: string[] = [`# ${collab.title}`, '', `> ${L.note}`, ''];

  out.push(`- ${L.start}: ${text.start}`, `- ${L.end}: ${text.end}`, `- ${L.status}: ${text.phase}`, `- ${L.updated}: ${collab.updatedAt.slice(0, 10)}`, `- ${L.page}: ${url}`, '');

  if (collab.summary) out.push(`## ${L.summary}`, '', collab.summary.trim(), '');
  if (collab.note) out.push(collab.note.trim(), '');

  const facts = [
    [L.category, collab.category ? [collab.category] : []],
    [L.partner, partner ? [partner.kind] : []],
    [L.region, collab.regions],
    [L.platform, collab.platforms],
    [L.type, collab.collabTypes],
  ] as const;
  const factLines = facts.filter(([, terms]) => terms.length > 0).map(([name, terms]) => `- ${name}: ${terms.map((t) => t.label).join(', ')}`);
  if (factLines.length) out.push(`## ${L.classification}`, '', ...factLines, '');

  if (collab.parties.length) {
    out.push(`## ${L.parties}`, '');
    for (const p of collab.parties) {
      const original = p.name.original && p.name.original !== p.name.value ? ` (${p.name.original})` : '';
      out.push(`- ${link(p.name.value, page(`/properties/${p.slug}`))}${original} — ${text.partyRole(p.role)} · ${p.kind.label}`);
    }
    out.push('');
  }

  if (collab.companies.length) {
    out.push(`## ${L.companies}`, '');
    for (const c of collab.companies) out.push(`- ${link(c.name.value, page(`/companies/${c.slug}`))} — ${text.companyRole(c.role)}`);
    out.push('');
  }

  if (collab.venues.length) {
    out.push(`## ${L.venues}`, '');
    for (const v of collab.venues) {
      out.push(`- ${v.url ? link(v.name, v.url) : v.name}${v.address ? ` — ${v.address}` : ''}`);
    }
    out.push('');
  }

  if (collab.sources.length) {
    out.push(`## ${L.sources}`, '');
    for (const s of collab.sources) {
      const meta = [s.publisher, text.sourceType(s.type), s.isPrimary ? L.primary : null, `${L.accessed} ${s.accessedAt}`].filter(Boolean).join(' · ');
      out.push(`- ${link(s.title, s.url)} — ${meta}${s.archiveUrl ? ` · ${link(L.archived, s.archiveUrl)}` : ''}`);
    }
    out.push('');
  }

  if (collab.related.length) {
    out.push(`## ${L.related}`, '');
    for (const r of collab.related) out.push(`- ${link(r.title, page(`/collabs/${r.slug}.md`))} — ${text.relation(r.relation)} · ${text.period(r)}`);
    out.push('');
  }

  return `${out.join('\n').trimEnd()}\n`;
}
