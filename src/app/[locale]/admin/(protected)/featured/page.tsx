import { redirect } from 'next/navigation';
import { FeaturedManager } from '@/components/admin/FeaturedManager';
import { adminApi } from '@/lib/api';
import { loadTrees } from '@/lib/admin-data';
import { getAdminSession } from '@/lib/auth/session';
import { flatten } from '@/lib/taxonomy';

export default async function FeaturedPage({ params }: PageProps<'/[locale]/admin/featured'>) {
  const { locale } = await params;
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);
  const api = adminApi(session.token);
  const [properties, trees] = await Promise.all([api.listEntities('property'), loadTrees()]);
  // 지원 여부는 작품·회사 화면과 같은 방식으로 본다(목록에 값이 오거나 공개 목록이 응답하면 지원)
  const supported = properties.some((e) => e.featuredOrder !== undefined || e.image !== undefined) || (await api.supportsFeatured());
  return (
    <main className="ct-admin-main">
      <FeaturedManager
        properties={properties}
        supported={supported}
        kindOptions={flatten(trees.partner_category).map((n) => ({ key: n.key, label: n.label }))}
      />
    </main>
  );
}
