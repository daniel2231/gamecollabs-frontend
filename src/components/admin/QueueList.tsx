'use client';

import { Badge, Button, Flex, Text } from '@radix-ui/themes';
import { useState, useTransition } from 'react';
import { loadQueuePage } from '@/app/[locale]/admin/actions';
import { LinkPending } from '@/components/site/Pending';
import { Link } from '@/i18n/navigation';
import type { QueueFilter } from '@/lib/api/types';
import type { AdminQueueItem } from '@/schema';

const STATUS_LABEL = { draft: 'draft', in_review: 'in_review', published: 'published', archived: 'archived' } as const;

function relative(iso: string): string {
  const diff = (Date.now() - Date.parse(iso)) / 60000;
  if (diff < 60) return `${Math.max(1, Math.round(diff))}분 전`;
  if (diff < 60 * 24) return `${Math.round(diff / 60)}시간 전`;
  if (diff < 60 * 48) return '어제';
  return iso.slice(0, 10);
}

type Props = {
  /** 첫 페이지(서버가 매번 다시 그린다) */
  items: AdminQueueItem[];
  nextCursor: string | null;
  filter: Omit<QueueFilter, 'cursor'>;
  /** 항목 주소에 붙일 현재 조건(status·origin·cover·q) */
  query: Record<string, string>;
  selectedId: string | null;
  emptyMessage: string;
};

/**
 * 검수 큐 목록. 백엔드는 한 번에 100건씩 주므로 “더 보기”로 다음 페이지를 붙인다.
 * 항목을 고르면 페이지가 서버에서 다시 그려지지만(첫 페이지만 다시 옴), 같은 조건이면
 * 이미 불러온 뒤쪽 페이지는 그대로 두어 고른 항목이 목록에서 사라지지 않게 한다.
 * 조건이 바뀌면 부모가 key를 바꿔 처음부터 다시 시작한다.
 */
export function QueueList({ items, nextCursor, filter, query, selectedId, emptyMessage }: Props) {
  const [extra, setExtra] = useState<AdminQueueItem[]>([]);
  // undefined: 아직 더 불러오지 않음(첫 페이지의 커서를 쓴다)
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  const firstIds = new Set(items.map((i) => i.id));
  const all = [...items, ...extra.filter((i) => !firstIds.has(i.id))];
  const next = cursor === undefined ? nextCursor : cursor;

  function loadMore() {
    if (!next) return;
    setError(null);
    startLoading(async () => {
      const res = await loadQueuePage({ ...filter, cursor: next });
      if (!res.ok) return setError(res.error.message ?? '더 불러오지 못했습니다');
      setExtra((prev) => [...prev, ...res.data.items]);
      setCursor(res.data.nextCursor);
    });
  }

  const href = (id: string) => `/admin?${new URLSearchParams({ ...query, id })}`;

  if (all.length === 0 && !next) {
    return (
      <Text as="p" color="gray" size="2" m="4">
        {emptyMessage}
      </Text>
    );
  }

  return (
    <>
      <ul className="ct-pending-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {all.map((q) => (
          <li key={q.id}>
            <Link href={href(q.id)} aria-current={q.id === selectedId ? 'true' : undefined}>
              <LinkPending />
              <Flex wrap="wrap" gap="1">
                <Badge size="1" variant="soft" color={q.status === 'in_review' ? 'indigo' : 'gray'}>
                  {STATUS_LABEL[q.status]}
                </Badge>
                <Badge size="1" variant="soft" color="gray" className="ct-mono">
                  {q.origin}
                </Badge>
                {q.duplicateCandidate && (
                  <Badge size="1" variant="soft" color="amber">
                    중복 후보
                  </Badge>
                )}
                {!filter.cover && q.hasCover === false && (
                  <Badge size="1" variant="outline" color="gray">
                    커버 없음
                  </Badge>
                )}
              </Flex>
              <Text weight="bold" size="2">
                {q.title}
              </Text>
              <Text size="1" color="gray" suppressHydrationWarning>
                {relative(q.updatedAt)} · 출처 {q.sourceCount}
              </Text>
            </Link>
          </li>
        ))}
      </ul>
      {(next || error) && (
        <Flex direction="column" align="center" gap="2" p="4">
          {error && (
            <Text size="1" color="red" role="alert">
              {error}
            </Text>
          )}
          {next && (
            <Button variant="soft" color="gray" size="2" onClick={loadMore} loading={loading} style={{ width: '100%' }}>
              더 보기 ({all.length}건 표시 중)
            </Button>
          )}
        </Flex>
      )}
    </>
  );
}
