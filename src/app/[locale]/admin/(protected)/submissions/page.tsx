import { redirect } from 'next/navigation';
import { SubmissionBoard } from '@/components/admin/SubmissionBoard';
import { adminApi } from '@/lib/api';
import { getAdminSession } from '@/lib/auth/session';
import { SUBMISSION_KINDS, SUBMISSION_STATUSES, type SubmissionKind, type SubmissionStatus } from '@/schema';

export default async function SubmissionsPage({ params, searchParams }: PageProps<'/[locale]/admin/submissions'>) {
  const { locale } = await params;
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);
  const sp = await searchParams;
  const status = (SUBMISSION_STATUSES as readonly string[]).includes(String(sp.status)) ? (sp.status as SubmissionStatus) : 'new';
  const kind = (SUBMISSION_KINDS as readonly string[]).includes(String(sp.kind)) ? (sp.kind as SubmissionKind) : undefined;
  const { items, counts } = await adminApi(session.token).listSubmissions({ status, kind });
  return (
    <main className="ct-admin-main">
      <SubmissionBoard key={`${status}-${kind ?? ''}`} status={status} kind={kind} items={items} counts={counts} />
    </main>
  );
}
