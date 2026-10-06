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
  const [entities, trees] = await Promise.all([adminApi(session.token).listEntities(kind, q || undefined), loadTrees()]);
  return (
    <main className="ct-admin-main">
      <EntitiesManager
        key={`${kind}:${q}`}
        kind={kind}
        q={q}
        entities={entities}
        kindOptions={flatten(trees.partner_category).map((n) => ({ key: n.key, label: n.label }))}
      />
    </main>
  );
}
