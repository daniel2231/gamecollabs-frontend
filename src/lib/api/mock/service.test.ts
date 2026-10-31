import { beforeEach, describe, expect, it } from 'vitest';
import type { AdminCollab, CollabInput, CollabQuery } from '@/schema';

const baseQuery: CollabQuery = { sort: 'start_desc', limit: 20, category: [], partner_category: [], region: [], platform: [], collab_type: [] };

/** 편집기에서 다시 저장할 때처럼, 연결된 작품만 입력으로 넘긴다 */
const asInput = (c: AdminCollab): CollabInput => ({
  ...c,
  parties: c.parties.flatMap((p) => (p.propertyId ? [{ propertyId: p.propertyId, role: p.role }] : [])),
});

async function load() {
  delete (globalThis as { __collabTrackerMock?: unknown }).__collabTrackerMock;
  const { vi } = await import('vitest');
  vi.resetModules();
  return import('./service');
}

describe('목 API: current 정렬', () => {
  it('진행 중 → 예정(가까운 순) → 종료 → 시기 미상 순으로, 먼 미래 콜라보가 맨 위에 오지 않는다', async () => {
    const svc = await load();
    const { items } = await svc.mockPublicApi.listCollabs({ ...baseQuery, sort: 'current', limit: 100 }, 'ko');
    const rank = { ongoing: 0, upcoming: 1, ended: 2, unknown: 3 } as const;
    const ranks = items.map((c) => rank[c.phase]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    const upcoming = items.filter((c) => c.phase === 'upcoming').map((c) => c.period.start!);
    expect(upcoming).toEqual([...upcoming].sort());
    const ongoing = items.filter((c) => c.phase === 'ongoing').map((c) => c.period.start!);
    expect(ongoing).toEqual([...ongoing].sort().reverse());
  });
});

describe('목 API: PRD 규칙', () => {
  let svc: Awaited<ReturnType<typeof load>>;
  beforeEach(async () => {
    svc = await load();
  });

  it('상위 키 필터가 하위 항목을 포함한다 (facetKeys)', async () => {
    const draft = await svc.mockAdminApi.getCollab('k_draft_sample');
    const input: CollabInput = {
      ...draft!,
      parties: [
        { propertyId: 'p_weplay', role: 'host' },
        { propertyId: 'p_aot', role: 'partner' },
      ],
      platforms: ['platform.mobile.android'],
      regions: ['region.north_america.us'],
      sources: [{ url: 'https://example.com/new', title: 't', publisher: 'p', type: 'press', isPrimary: true, accessedAt: '2026-10-06' }],
    };
    await svc.mockAdminApi.updateCollab('k_draft_sample', input, draft!.rev);
    await svc.mockAdminApi.transition('k_draft_sample', 'publish');

    const mobile = await svc.mockPublicApi.listCollabs({ ...baseQuery, platform: ['platform.mobile'] }, 'ko');
    expect(mobile.items.map((c) => c.slug)).toEqual(['sample-draft-attack-on-titan']);
    const na = await svc.mockPublicApi.listCollabs({ ...baseQuery, region: ['region.north_america'] }, 'ko');
    expect(na.total).toBe(1);
    // 필드 간 AND
    const both = await svc.mockPublicApi.listCollabs({ ...baseQuery, platform: ['platform.mobile'], region: ['region.japan'] }, 'ko');
    expect(both.total).toBe(0);
    // partner 작품의 kind도 facet
    const anime = await svc.mockPublicApi.listCollabs({ ...baseQuery, partner_category: ['partner_category.anime_manga'] }, 'ko');
    expect(anime.total).toBe(3);
  });

  it('en 요청 시 영문이 없으면 한국어로 대체하고 fallback 표시', async () => {
    const res = await svc.mockPublicApi.getCollab('blood-strike-attack-on-titan', 'en');
    expect(res?.title).toBe('Blood Strike × 진격의 거인');
    expect(res?.fallback).toBe(true);
    const ok = await svc.mockPublicApi.getCollab('taiko-no-tatsujin-jagariko-2026-10', 'en');
    expect(ok?.fallback).toBe(false);
  });

  it('같은 출처 URL은 중복 후보로 잡는다', async () => {
    const draft = await svc.mockAdminApi.getCollab('k_draft_sample');
    expect(draft?.duplicates).toEqual([expect.objectContaining({ slug: 'weplay-attack-on-titan', reason: 'same_source' })]);
  });

  it('발행 조건을 검증하고, rev가 다르면 거부한다', async () => {
    await expect(svc.mockAdminApi.transition('k_draft_sample', 'publish')).rejects.toMatchObject({ status: 422, code: 'validation_failed' });
    const draft = await svc.mockAdminApi.getCollab('k_draft_sample');
    await expect(svc.mockAdminApi.updateCollab('k_draft_sample', asInput(draft!), draft!.rev - 1)).rejects.toMatchObject({ status: 412 });
  });

  it('통제 어휘 밖의 키는 저장할 수 없다', async () => {
    const draft = await svc.mockAdminApi.getCollab('k_draft_sample');
    await expect(svc.mockAdminApi.updateCollab('k_draft_sample', { ...asInput(draft!), platforms: ['Mobile'] }, draft!.rev)).rejects.toMatchObject({
      code: 'validation_failed',
      fields: { platforms: expect.any(String) },
    });
  });

  it('병합하면 콜라보 참조가 옮겨지고 이름이 별칭이 된다', async () => {
    const merged = await svc.mockAdminApi.mergeEntities('property', 'p_weplay', 'p_bloodstrike');
    expect(merged.aliases).toContain('WePlay');
    const bs = await svc.mockPublicApi.getProperty('blood-strike', 'ko');
    expect(bs?.collabs.map((c) => c.slug)).toContain('weplay-attack-on-titan');
    expect(await svc.mockPublicApi.getProperty('weplay', 'ko')).toBeNull();
  });

  it('후속 확인: 제안을 반영하면 rev가 오르고 출처가 붙으며, 버리면 제안만 사라진다', async () => {
    const admin = svc.mockAdminApi;
    const proposals = await admin.listFollowUps('proposals');
    expect(proposals.map((f) => f.id)).toEqual(['k_weplay_aot']);
    expect((await admin.listFollowUps('escalated')).map((f) => f.id)).toEqual(['k_bloodstrike_aot']);

    const item = proposals[0]!;
    await expect(admin.resolveFollowUp(item.id, 'apply', item.rev + 1)).rejects.toMatchObject({ status: 412 });
    const applied = await admin.resolveFollowUp(item.id, 'apply', item.rev);
    expect(applied.rev).toBe(item.rev + 1);
    expect(applied.i18n.en.title).toBe('WePlay × Attack on Titan');
    expect(applied.sources.map((s) => s.url)).toContain('https://example.com/weplay-attack-on-titan/announcement');
    expect(applied.followUp!.proposal).toBeNull();
    expect(await admin.listFollowUps('proposals')).toEqual([]);
    await expect(admin.resolveFollowUp(item.id, 'dismiss')).rejects.toMatchObject({ status: 404 });
  });

  it('홈 노출 작품: 순서대로, 노출을 끄면 빠지고, 대표 이미지는 저장한 그대로 나온다', async () => {
    const order = async () => (await svc.mockPublicApi.listFeaturedProperties('ko')).map((p) => p.slug);
    expect(await order()).toEqual(['attack-on-titan', 'jagariko']);

    const [aot] = await svc.mockAdminApi.listEntities('property', 'attack-on-titan');
    const input = { slug: aot!.slug, name: aot!.name, aliases: aot!.aliases, category: aot!.category, country: null };
    await svc.mockAdminApi.updateEntity('property', aot!.id, { ...input, featuredOrder: 3 });
    expect(await order()).toEqual(['jagariko', 'attack-on-titan']);

    // featuredOrder를 보내지 않으면(undefined) 그대로 둔다
    await svc.mockAdminApi.updateEntity('property', aot!.id, input);
    expect(await order()).toEqual(['jagariko', 'attack-on-titan']);

    const image = { storageKey: 'covers/aot.webp', url: 'https://media.example.com/covers/aot.webp', originalUrl: null, credit: '', alt: { ko: '', en: '' }, width: 800, height: 1000 };
    await svc.mockAdminApi.updateEntity('property', aot!.id, { ...input, featuredOrder: null, image });
    expect(await order()).toEqual(['jagariko']);
    const [saved] = await svc.mockAdminApi.listEntities('property', 'attack-on-titan');
    expect(saved).toMatchObject({ featuredOrder: null, image: { storageKey: 'covers/aot.webp' } });

    const [jagariko] = await svc.mockPublicApi.listFeaturedProperties('en');
    expect(jagariko).toMatchObject({ name: { value: 'Jagariko' }, collabCount: 1, counterpartCount: 1, image: null });
  });

  it('제보: 오류 제보는 발행된 콜라보에 연결되고, 열린 같은 제보는 한 번만 쌓이며, 처리하면 미처리 수에서 빠진다', async () => {
    const slug = 'taiko-no-tatsujin-jagariko-2026-10';
    const report = { kind: 'correction' as const, collab: slug, note: '종료일이 발표되었습니다.', locale: 'ko' as const };
    await svc.mockPublicApi.submitReport(report, '1.2.3.4');
    await svc.mockPublicApi.submitReport(report, '1.2.3.4');
    await svc.mockPublicApi.submitReport({ kind: 'tip', url: 'https://example.com/news', locale: 'en' }, '1.2.3.4');
    await expect(svc.mockPublicApi.submitReport({ ...report, collab: 'sample-draft-attack-on-titan' }, '1.2.3.4')).rejects.toMatchObject({ status: 404 });

    const open = await svc.mockAdminApi.listSubmissions({ status: 'new' });
    expect(open.counts).toEqual({ tip: 1, correction: 1 });
    const correction = (await svc.mockAdminApi.listSubmissions({ status: 'new', kind: 'correction' })).items;
    expect(correction).toHaveLength(1);
    expect(correction[0]).toMatchObject({ url: null, note: report.note, collab: { id: 'k_taiko_jagariko', slug, status: 'published' } });

    await svc.mockAdminApi.updateSubmission(correction[0]!.id, 'accepted');
    expect((await svc.mockAdminApi.listSubmissions({ status: 'new' })).counts).toEqual({ tip: 1, correction: 0 });
    expect((await svc.mockAdminApi.listSubmissions({ status: 'accepted' })).items).toHaveLength(1);
  });

  it('제보: IP당 시간당 10건까지만 받는다', async () => {
    for (let i = 0; i < 10; i++) await svc.mockPublicApi.submitReport({ kind: 'tip', url: `https://example.com/${i}`, locale: 'ko' }, '5.6.7.8');
    await expect(svc.mockPublicApi.submitReport({ kind: 'tip', url: 'https://example.com/x', locale: 'ko' }, '5.6.7.8')).rejects.toMatchObject({ code: 'rate_limited' });
    await svc.mockPublicApi.submitReport({ kind: 'tip', url: 'https://example.com/x', locale: 'ko' }, '9.9.9.9');
  });
});

describe('목 API: 변경 내역', () => {
  let svc: Awaited<ReturnType<typeof load>>;
  beforeEach(async () => {
    svc = await load();
  });

  it('공개 항목만 최신순으로, 요청 언어 본문만 내려준다', async () => {
    await svc.mockAdminApi.createChangelog({ version: '0.3.0', date: '2026-10-20', body: { ko: '같은 날 나중', en: 'Same day, later' }, published: true });
    const en = await svc.mockPublicApi.listChangelog('en');
    expect(en.map((e) => e.version)).toEqual(['0.3.0', '0.1.0']);
    expect(en[0]?.body).toBe('Same day, later');
    const all = await svc.mockAdminApi.listChangelog();
    // 같은 날짜(0.2.0, 0.3.0)는 나중에 만든 것 먼저
    expect(all.map((e) => e.version)).toEqual(['0.3.0', '0.2.0', '0.1.0']);
  });

  it('같은 버전은 거절하고, 수정·삭제한다', async () => {
    const input = { version: '0.1.0', date: '2026-10-21', body: { ko: '중복', en: 'Duplicate' }, published: true };
    await expect(svc.mockAdminApi.createChangelog(input)).rejects.toMatchObject({ status: 409, code: 'duplicate_key' });
    const updated = await svc.mockAdminApi.updateChangelog('chg_mock2', { version: '0.2.0', date: '2026-10-20', body: { ko: '고침', en: 'Fixed' }, published: true });
    expect(updated).toMatchObject({ published: true, body: { en: 'Fixed' } });
    await svc.mockAdminApi.deleteChangelog('chg_mock1');
    expect((await svc.mockPublicApi.listChangelog('ko')).map((e) => e.version)).toEqual(['0.2.0']);
    await expect(svc.mockAdminApi.deleteChangelog('chg_mock1')).rejects.toMatchObject({ status: 404 });
  });
});
