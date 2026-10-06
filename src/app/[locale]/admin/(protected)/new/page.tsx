import { CollabEditor } from '@/components/admin/CollabEditor';
import { loadTrees } from '@/lib/admin-data';

export default async function NewCollabPage({ params }: PageProps<'/[locale]/admin/new'>) {
  const { locale } = await params;
  const trees = await loadTrees();
  return (
    <main className="ct-admin-main">
      <CollabEditor collab={null} trees={trees} entities={{}} locale={locale} />
    </main>
  );
}
