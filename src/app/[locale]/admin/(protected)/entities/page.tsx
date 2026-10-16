import { redirect } from 'next/navigation';
import { EntitiesManager } from '@/components/admin/EntitiesManager';
import { adminApi } from '@/lib/api';
import { loadTrees } from '@/lib/admin-data';
import { getAdminSession } from '@/lib/auth/session';
import { flatten } from '@/lib/taxonomy';

export default async function EntitiesPage({ params, searchParams }: PageProps<'/[locale]/admin/entities'>) {
  const { locale } = await params;
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);
  const sp = await searchParams;
  const kind = sp.kind === 'company' ? 'company' : 'property';
  const q = typeof sp.q === 'string' ? sp.q.slice(0, 100) : '';
  const api = adminApi(session.token);
  const [entities, trees] = await Promise.all([api.listEntities(kind, q || undefined), loadTrees()]);
  // 작품 홈 노출 지원 여부: 목록에 그 값이 오면 지원. 아직 아무것도 노출하지 않아 값이 비어 올 수 있으니 공개 목록도 확인한다
  const featuredSupported =
    kind === 'property' && (entities.some((e) => e.featuredOrder !== undefined || e.image !== undefined) || (await api.supportsFeatured()));
  return (
    <main className="ct-admin-main">
      <EntitiesManager
        key={`${kind}:${q}`}
        kind={kind}
        q={q}
        entities={entities}
        featuredSupported={featuredSupported}
        kindOptions={flatten(trees.partner_category).map((n) => ({ key: n.key, label: n.label }))}
      />
    </main>
  );
}
