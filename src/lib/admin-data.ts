import 'server-only';
import type { EntityChoice } from '@/components/admin/EntityCombobox';
import type { Trees } from '@/components/admin/CollabEditor';
import { api, type AdminApi } from '@/lib/api';
import { buildTree } from '@/lib/taxonomy';
import type { AdminCollab } from '@/schema';

/** 편집기에 필요한 분류 트리(관리자 화면은 한국어 라벨) */
export async function loadTrees(): Promise<Trees> {
  const terms = await api.getTaxonomies();
  return {
    category: buildTree(terms, 'category', 'ko'),
    region: buildTree(terms, 'region', 'ko'),
    platform: buildTree(terms, 'platform', 'ko'),
    collab_type: buildTree(terms, 'collab_type', 'ko'),
    partner_category: buildTree(terms, 'partner_category', 'ko'),
  };
}

/** 문서가 가리키는 작품·회사 id → 표시 이름 */
export async function loadEntityNames(admin: AdminApi, collab: AdminCollab | null): Promise<Record<string, EntityChoice>> {
  if (!collab) return {};
  const [props, comps] = await Promise.all([admin.listEntities('property'), admin.listEntities('company')]);
  const ids = new Set([...collab.parties.map((p) => p.propertyId), ...collab.companies.map((c) => c.companyId)]);
  return Object.fromEntries(
    [...props, ...comps]
      .filter((e) => ids.has(e.id))
      .map((e) => [e.id, { id: e.id, slug: e.slug, label: e.name.ko, category: e.category }]),
  );
}
