'use client';

import { Text } from '@radix-ui/themes';
import { useSearchParams } from 'next/navigation';
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

export function AdminNav({ counts }: { counts: Counts }) {
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
          {l.label}
          <span className="ct-mono" style={{ color: current === l.status ? undefined : 'var(--gray-11)' }}>
            {counts[l.status]}
          </span>
        </Link>
      ))}
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
