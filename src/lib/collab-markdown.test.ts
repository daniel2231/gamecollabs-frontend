import { describe, expect, it } from 'vitest';
import type { CollabDetail } from '@/schema';
import { collabMarkdown, type CollabMarkdownText } from './collab-markdown';

const term = (key: string, label: string) => ({ key, label });
const period = { start: '2026-10-01', end: '2026-10-31', precision: 'day', endKind: 'fixed' } as CollabDetail['period'];

const collab = {
  slug: 'taiko-jagariko-2026-10',
  title: 'Taiko no Tatsujin × Jagariko',
  fallback: false,
  phase: 'ongoing',
  period,
  parties: [
    { slug: 'taiko', role: 'host', kind: term('partner_category.game', 'Game'), name: { value: 'Taiko no Tatsujin', fallback: false, original: '太鼓の達人' } },
    { slug: 'jagariko', role: 'partner', kind: term('partner_category.brand', 'Brand'), name: { value: 'Jagariko', fallback: false } },
  ],
  category: term('category.in_game', 'In-game'),
  regions: [term('region.japan', 'Japan')],
  platforms: [],
  collabTypes: [],
  cover: null,
  publishedAt: '2026-09-20T00:00:00Z',
  summary: 'Snack-themed songs.',
  summaryFallback: false,
  note: null,
  companies: [{ slug: 'bandai-namco', role: 'publisher', name: { value: 'Bandai Namco', fallback: false } }],
  sources: [
    { url: 'https://example.com/news', title: 'Announcement [JP]', publisher: 'Bandai Namco', type: 'official', isPrimary: true, accessedAt: '2026-09-21' },
  ],
  venues: [],
  related: [],
  updatedAt: '2026-09-22T10:00:00Z',
} as unknown as CollabDetail;

const text: CollabMarkdownText = {
  phase: 'Ongoing',
  start: '2026.10.01',
  end: '2026.10.31',
  labels: {
    start: 'Start',
    end: 'End',
    status: 'Status',
    summary: 'Summary',
    classification: 'Classification',
    category: 'Category',
    partner: 'Partner',
    region: 'Region',
    platform: 'Platform',
    type: 'Type',
    venues: 'Venues',
    parties: 'Properties involved',
    companies: 'Companies involved',
    sources: 'Sources',
    related: 'Related collabs',
    primary: 'Primary source',
    archived: 'Archived copy',
    accessed: 'Checked',
    updated: 'Last updated',
    page: 'Web page',
    note: 'Markdown copy.',
  },
  partyRole: (r) => (r === 'host' ? 'Host' : 'Partner'),
  companyRole: () => 'Publisher',
  sourceType: () => 'Official',
  relation: () => 'Same game',
  period: () => '2025.01 – 2025.02',
};

describe('collabMarkdown', () => {
  const md = collabMarkdown(collab, { base: 'https://x.test', locale: 'en', text });

  it('핵심 사실을 맨 위 목록에 둔다', () => {
    expect(md.startsWith('# Taiko no Tatsujin × Jagariko\n')).toBe(true);
    expect(md).toContain('- Start: 2026.10.01\n- End: 2026.10.31\n- Status: Ongoing\n- Last updated: 2026-09-22\n- Web page: https://x.test/en/collabs/taiko-jagariko-2026-10');
  });

  it('참여 작품·회사를 같은 언어의 절대 주소로 잇고 원어 이름을 함께 쓴다', () => {
    expect(md).toContain('- [Taiko no Tatsujin](https://x.test/en/properties/taiko) (太鼓の達人) — Host · Game');
    expect(md).toContain('- [Bandai Namco](https://x.test/en/companies/bandai-namco) — Publisher');
  });

  it('값이 있는 분류만 넣는다', () => {
    expect(md).toContain('- Category: In-game\n- Partner: Brand\n- Region: Japan\n');
    expect(md).not.toContain('Platform:');
  });

  it('출처의 대괄호를 이스케이프하고 유형·확인일을 붙인다', () => {
    expect(md).toContain('- [Announcement \\[JP\\]](https://example.com/news) — Bandai Namco · Official · Primary source · Checked 2026-09-21');
  });

  it('빈 섹션은 넣지 않고 줄바꿈 하나로 끝난다', () => {
    expect(md).not.toContain('## Venues');
    expect(md).not.toContain('## Related collabs');
    expect(md.endsWith('\n')).toBe(true);
    expect(md.endsWith('\n\n')).toBe(false);
  });

  it('관련 콜라보는 마크다운 사본으로 잇는다', () => {
    const withRelated = { ...collab, related: [{ ...collab, slug: 'taiko-other', title: 'Taiko × Other', relation: 'same_host' }] } as unknown as CollabDetail;
    expect(collabMarkdown(withRelated, { base: 'https://x.test', locale: 'ko', text })).toContain(
      '- [Taiko × Other](https://x.test/ko/collabs/taiko-other.md) — Same game · 2025.01 – 2025.02',
    );
  });
});
