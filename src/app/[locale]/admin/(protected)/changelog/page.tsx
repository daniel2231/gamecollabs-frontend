import { Callout } from '@radix-ui/themes';
import { redirect } from 'next/navigation';
import { ChangelogManager } from '@/components/admin/ChangelogManager';
import { adminApi, ApiError } from '@/lib/api';
import { getAdminSession } from '@/lib/auth/session';

export default async function ChangelogAdminPage({ params }: PageProps<'/[locale]/admin/changelog'>) {
  const { locale } = await params;
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);
  try {
    const entries = await adminApi(session.token).listChangelog();
    return (
      <main className="ct-admin-main">
        <ChangelogManager entries={entries} />
      </main>
    );
  } catch (e) {
    // 편집자(editor)는 변경 내역을 쓸 수 없다(백엔드 changelog:write는 관리자만). 백엔드에 기능이 없을 때도 여기서 안내한다
    if (!(e instanceof ApiError) || (e.status !== 403 && e.status !== 501)) throw e;
    return (
      <main className="ct-admin-main">
        <Callout.Root color={e.status === 403 ? 'gray' : 'amber'}>
          <Callout.Text>{e.status === 403 ? '변경 내역은 관리자(admin)만 작성할 수 있습니다.' : e.message}</Callout.Text>
        </Callout.Root>
      </main>
    );
  }
}
