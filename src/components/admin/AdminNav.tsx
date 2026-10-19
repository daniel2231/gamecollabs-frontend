'use client';

import { Text } from '@radix-ui/themes';
import { useSearchParams } from 'next/navigation';
import { LinkPending } from '@/components/site/Pending';
import { Link, usePathname } from '@/i18n/navigation';

type Counts = Record<'review' | 'draft' | 'in_review' | 'published' | 'archived', number>;

const STATUS_LINKS = [
  { status: 'review', label: '검수 대기' },
  { status: 'draft', label: '초안' },
  { status: 'in_review', label: '검수 요청됨' },
  { status: 'published', label: '발행됨' },
  { status: 'archived', label: '보관' },
] as const;

const DATA_LINKS = [
  { href: '/admin/entities', label: '작품·회사' },
  { href: '/admin/taxonomy', label: '분류 어휘' },
] as const;

/** followUps: 처리할 재확인 제안 수, submissions: 처리하지 않은 제보 수(백엔드가 기능을 모르거나 실패하면 null) */
export function AdminNav({ counts, followUps, submissions }: { counts: Counts; followUps: number | null; submissions: number | null }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = pathname === '/admin' ? (params.get('status') ?? 'review') : null;
  return (
    <>
      <Text as="div" size="1" color="gray" style={{ padding: "0 8px 4px" }}>
        콜라보
      </Text>
      {STATUS_LINKS.map((l) => (
        <Link key={l.status} href={l.status === 'review' ? '/admin' : `/admin?status=${l.status}`} aria-current={current === l.status ? 'page' : undefined}>
          <LinkPending scope="list" />
          {l.label}
          <span className="ct-mono" style={{ color: current === l.status ? undefined : 'var(--gray-11)' }}>
            {counts[l.status]}
          </span>
        </Link>
      ))}
      <Link href="/admin/followups" aria-current={pathname.startsWith('/admin/followups') ? 'page' : undefined}>
        <LinkPending scope="list" />
        후속 확인
        {followUps !== null && (
          <span className="ct-mono" style={{ color: pathname.startsWith('/admin/followups') ? undefined : 'var(--gray-11)' }}>
            {followUps >= 50 ? '50+' : followUps}
          </span>
        )}
      </Link>
      <Link href="/admin/submissions" aria-current={pathname.startsWith('/admin/submissions') ? 'page' : undefined}>
        <LinkPending scope="list" />
        제보
        {submissions !== null && (
          <span className="ct-mono" style={{ color: pathname.startsWith('/admin/submissions') ? undefined : 'var(--gray-11)' }}>
            {submissions >= 100 ? '100+' : submissions}
          </span>
        )}
      </Link>
      <Link href="/admin/new" aria-current={pathname === '/admin/new' ? 'page' : undefined}>
        + 새 콜라보
      </Link>
      <Text as="div" size="1" color="gray" style={{ padding: "16px 8px 4px" }}>
        데이터
      </Text>
      {DATA_LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={pathname.startsWith(l.href) ? 'page' : undefined}>
          {l.label}
        </Link>
      ))}
    </>
  );
}
