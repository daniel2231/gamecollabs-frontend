import { TaxonomyManager } from '@/components/admin/TaxonomyManager';
import { api } from '@/lib/api';

export default async function TaxonomyPage() {
  const terms = await api.getTaxonomies();
  return (
    <main className="ct-admin-main">
      <TaxonomyManager terms={terms} />
    </main>
  );
}
