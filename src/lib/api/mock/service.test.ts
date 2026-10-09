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
});
