import { redirect } from 'next/navigation';
import { MembersBoard } from '@/components/admin/MembersBoard';
import { adminApi, ApiError } from '@/lib/api';
import type { MemberList } from '@/lib/api/types';
import { getAdminSession } from '@/lib/auth/session';
import { MEMBER_STATUS_FILTERS, type MemberStats, type MemberStatusFilter } from '@/schema';

/**
 * 회원: 통계(편집자도)와 Discord 회원 목록(관리자만: 개인정보). 목록은 검색어·상태·커서를 주소에 둔다.
 * 편집자가 목록을 열면 백엔드가 403을 주고, 화면은 통계만 보여 준다.
 */
export default async function MembersPage({ params, searchParams }: PageProps<'/[locale]/admin/members'>) {
  const { locale } = await params;
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);
  const sp = await searchParams;
  const q = typeof sp.q === 'string' && sp.q.trim() ? sp.q.trim().slice(0, 64) : undefined;
  const status = (MEMBER_STATUS_FILTERS as readonly string[]).includes(String(sp.status)) ? (sp.status as MemberStatusFilter) : 'all';
  const cursor = typeof sp.cursor === 'string' ? sp.cursor : undefined;
  const admin = adminApi(session.token);

  const [stats, list] = await Promise.all([
    admin.getMemberStats().then(
      (s): MemberStats | string => s,
      (e) => (e instanceof ApiError ? e.message : '통계를 불러오지 못했습니다'),
    ),
    admin.listMembers({ q, status, cursor }).then(
      (l): MemberList | 'forbidden' | string => l,
      (e) => (e instanceof ApiError && e.status === 403 ? 'forbidden' : e instanceof ApiError ? e.message : '회원 목록을 불러오지 못했습니다'),
    ),
  ]);

  return (
    <main className="ct-admin-main">
      <MembersBoard key={`${q ?? ''}-${status}-${cursor ?? ''}`} stats={stats} list={list} q={q ?? ''} status={status} paged={!!cursor} />
    </main>
  );
}
