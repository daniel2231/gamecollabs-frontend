'use client';

import { CheckIcon, ExternalLinkIcon, ResetIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge, Button, Callout, Card, DataList, Flex, Heading, TabNav, Text } from '@radix-ui/themes';
import { useState, useTransition } from 'react';
import { updateSubmission } from '@/app/[locale]/admin/actions';
import { LinkPending } from '@/components/site/Pending';
import { Link, useRouter } from '@/i18n/navigation';
import type { Submission, SubmissionKind, SubmissionStatus } from '@/schema';

const STATUSES: { status: SubmissionStatus; label: string; empty: string }[] = [
  { status: 'new', label: '미처리', empty: '처리할 제보가 없습니다.' },
  { status: 'accepted', label: '반영함', empty: '반영한 제보가 없습니다.' },
  { status: 'dismissed', label: '버림', empty: '버린 제보가 없습니다.' },
];

const KINDS: { kind: SubmissionKind | undefined; label: string }[] = [
  { kind: undefined, label: '전체' },
  { kind: 'correction', label: '오류 제보' },
  { kind: 'tip', label: '새 콜라보' },
];

const KIND_LABEL: Record<SubmissionKind, string> = { correction: '오류 제보', tip: '새 콜라보' };
const COLLAB_STATUS_LABEL = { draft: '초안', in_review: '검수 요청됨', published: '발행됨', archived: '보관' } as const;

function href(status: SubmissionStatus, kind?: SubmissionKind) {
  const sp = new URLSearchParams({ ...(status === 'new' ? {} : { status }), ...(kind ? { kind } : {}) });
  return `/admin/submissions${sp.size ? `?${sp}` : ''}`;
}

type Props = { status: SubmissionStatus; kind?: SubmissionKind; items: Submission[]; counts: Record<SubmissionKind, number> };

/**
 * 방문자 제보 큐(F-15). 오류 제보는 편집기에서 고친 뒤 “반영함”, 새 콜라보 제보는 출처를 확인해 등록한 뒤 “반영함”.
 * 근거가 없거나 중복이면 “버림”. 처리한 제보는 다시 열 수 있다.
 */
export function SubmissionBoard({ status, kind, items, counts }: Props) {
  const current = STATUSES.find((s) => s.status === status)!;
  return (
    <Flex direction="column" gap="4">
      <Flex direction="column" gap="1">
        <Heading as="h1" size="6">
          제보
        </Heading>
        <Text size="2" color="gray">
          방문자가 보낸 오류 제보(발행된 콜라보)와 새 콜라보 제보입니다. 미처리: 오류 제보 {counts.correction}건 · 새 콜라보 {counts.tip}건
        </Text>
      </Flex>
      <TabNav.Root>
        {STATUSES.map((s) => (
          <TabNav.Link key={s.status} asChild active={s.status === status}>
            <Link href={href(s.status, kind)}>
              <LinkPending />
              {s.label}
            </Link>
          </TabNav.Link>
        ))}
      </TabNav.Root>
      <Flex gap="2" wrap="wrap">
        {KINDS.map((k) => (
          <Button key={k.label} asChild size="1" variant={k.kind === kind ? 'solid' : 'soft'} color="gray" highContrast={k.kind === kind}>
            <Link href={href(status, k.kind)} aria-current={k.kind === kind ? 'page' : undefined}>
              {k.label}
              {status === 'new' && k.kind && <span className="ct-mono">{counts[k.kind]}</span>}
            </Link>
          </Button>
        ))}
      </Flex>
      {items.length === 0 ? (
        <Text color="gray" size="2">
          {current.empty}
        </Text>
      ) : (
        <Flex direction="column" gap="3" className="ct-pending-target">
          {items.map((item) => (
            <SubmissionCard key={item.id} item={item} />
          ))}
        </Flex>
      )}
    </Flex>
  );
}

function SubmissionCard({ item }: { item: Submission }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<SubmissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const c = item.collab;
  const editorHref = c
    ? `/admin?${new URLSearchParams({ ...(c.status === 'draft' || c.status === 'in_review' ? {} : { status: c.status }), id: c.id })}`
    : null;

  function act(next: SubmissionStatus) {
    setError(null);
    setBusy(next);
    start(async () => {
      const res = await updateSubmission(item.id, next);
      setBusy(null);
      if (!res.ok) return setError(res.error.message ?? res.error.code);
      router.refresh();
    });
  }

  return (
    <Card size="2">
      <Flex direction="column" gap="3">
        <Flex justify="between" align="start" gap="3" wrap="wrap">
          <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
            <Flex gap="1" wrap="wrap" align="center">
              <Badge size="1" variant="soft" color={item.kind === 'correction' ? 'amber' : 'indigo'}>
                {KIND_LABEL[item.kind]}
              </Badge>
              {c && (
                <Badge size="1" variant="soft" color={c.status === 'published' ? 'grass' : 'gray'}>
                  {COLLAB_STATUS_LABEL[c.status]}
                </Badge>
              )}
              <Text size="1" color="gray" className="ct-mono">
                {item.createdAt.slice(0, 16).replace('T', ' ')}
                {item.locale && ` · ${item.locale}`}
              </Text>
            </Flex>
            {c ? (
              <>
                <Text weight="bold">{c.title.ko || c.title.en || c.slug}</Text>
                <Text size="1" color="gray" className="ct-mono">
                  {c.slug}
                </Text>
              </>
            ) : (
              item.url && (
                <a href={item.url} target="_blank" rel="noreferrer noopener" style={{ wordBreak: 'break-all', fontWeight: 600 }}>
                  {item.url} <ExternalLinkIcon aria-label="새 창" />
                </a>
              )
            )}
          </Flex>
          <Flex gap="2" wrap="wrap">
            {c && c.status === 'published' && (
              <Button asChild size="1" variant="soft" color="gray">
                <a href={`/ko/collabs/${c.slug}`} target="_blank" rel="noreferrer">
                  공개 페이지 <ExternalLinkIcon />
                </a>
              </Button>
            )}
            {editorHref ? (
              <Button asChild size="1" variant="soft" color="gray">
                <Link href={editorHref}>
                  <LinkPending />
                  편집기에서 열기
                </Link>
              </Button>
            ) : (
              item.status === 'new' && (
                <Button asChild size="1" variant="soft" color="gray">
                  <Link href="/admin/new">
                    <LinkPending />
                    새 콜라보 등록
                  </Link>
                </Button>
              )
            )}
          </Flex>
        </Flex>

        <DataList.Root size="1">
          <DataList.Item>
            <DataList.Label>{item.kind === 'correction' ? '내용' : '메모'}</DataList.Label>
            <DataList.Value>
              {item.note ? (
                <Text style={{ whiteSpace: 'pre-line' }}>{item.note}</Text>
              ) : (
                <Text color="gray">없음</Text>
              )}
            </DataList.Value>
          </DataList.Item>
          {c && (
            <DataList.Item>
              <DataList.Label>근거</DataList.Label>
              <DataList.Value>
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer noopener" style={{ wordBreak: 'break-all' }}>
                    {item.url} <ExternalLinkIcon aria-label="새 창" />
                  </a>
                ) : (
                  <Text color="gray">없음</Text>
                )}
              </DataList.Value>
            </DataList.Item>
          )}
        </DataList.Root>

        {error && (
          <Callout.Root color="red" size="1" role="alert">
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}
        <Flex gap="2" justify="end">
          {item.status === 'new' ? (
            <>
              <Button variant="soft" color="gray" onClick={() => act('dismissed')} disabled={pending} loading={busy === 'dismissed'}>
                <TrashIcon /> 버림
              </Button>
              <Button onClick={() => act('accepted')} disabled={pending} loading={busy === 'accepted'}>
                <CheckIcon /> 반영함
              </Button>
            </>
          ) : (
            <Button variant="soft" color="gray" onClick={() => act('new')} disabled={pending} loading={busy === 'new'}>
              <ResetIcon /> 다시 열기
            </Button>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}
