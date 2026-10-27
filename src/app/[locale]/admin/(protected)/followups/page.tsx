import { redirect } from 'next/navigation';
import { FollowUpBoard } from '@/components/admin/FollowUpBoard';
import { adminApi, ApiError } from '@/lib/api';
import { getAdminSession } from '@/lib/auth/session';
import { FOLLOW_UP_VIEWS, type FollowUpItem, type FollowUpView } from '@/schema';

export default async function FollowUpsPage({ params, searchParams }: PageProps<'/[locale]/admin/followups'>) {
  const { locale } = await params;
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);
  const sp = await searchParams;
  // 예전 주소 ?view=due는 확인 예정(전체)으로 연다
  const requested = sp.view === 'due' ? 'queued' : String(sp.view);
  const view = (FOLLOW_UP_VIEWS as readonly string[]).includes(requested) ? (requested as FollowUpView) : 'proposals';
  let items: FollowUpItem[] = [];
  let unavailable: string | undefined;
  try {
    items = await adminApi(session.token).listFollowUps(view, view === 'queued' ? 100 : 50);
  } catch (e) {
    // 백엔드에 아직 후속 확인 API가 없을 때는 화면만 안내한다
    if (!(e instanceof ApiError) || e.code !== 'followups_unavailable') throw e;
    unavailable = e.message;
  }
  return (
    <main className="ct-admin-main">
      <FollowUpBoard key={view} view={view} items={items} unavailable={unavailable} />
    </main>
  );
}
