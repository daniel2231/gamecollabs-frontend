'use client';

import { CheckIcon, ExternalLinkIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge, Button, Callout, Card, DataList, Flex, Heading, TabNav, Text } from '@radix-ui/themes';
import { useState, useTransition } from 'react';
import { resolveFollowUp } from '@/app/[locale]/admin/actions';
import { LinkPending } from '@/components/site/Pending';
import { Link, useRouter } from '@/i18n/navigation';
import { adminPeriodLabel, ESCALATE_AFTER, FOLLOW_UP_REASON_HINT, FOLLOW_UP_REASON_LABEL } from '@/lib/followup';
import type { FollowUpItem, FollowUpView } from '@/schema';

const VIEWS: { view: FollowUpView; label: string; empty: string }[] = [
  { view: 'proposals', label: '제안', empty: '처리할 재확인 제안이 없습니다.' },
  { view: 'escalated', label: '알림', empty: '결정이 필요한 콜라보가 없습니다.' },
  { view: 'due', label: '확인 예정', empty: '지금 확인할 차례인 콜라보가 없습니다.' },
];

const STATUS_LABEL = { draft: '초안', in_review: '검수 요청됨', published: '발행됨', archived: '보관' } as const;

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '—');

type Props = { view: FollowUpView; items: FollowUpItem[]; unavailable?: string };

/**
 * 후속 확인(날짜가 덜 발표된 콜라보 재확인) 관리 화면.
 * 제안: 수집기가 검수 중·발행된 콜라보에서 찾은 변경 → 반영 또는 버리기.
 * 알림: 여러 번 확인해도 소식이 없음 → 편집기에서 날짜를 넣거나 “상시”로 바꾸거나 보관.
 * 확인 예정: 수집기가 다음에 볼 목록(참고용).
 */
export function FollowUpBoard({ view, items, unavailable }: Props) {
  const current = VIEWS.find((v) => v.view === view)!;
  return (
    <Flex direction="column" gap="4">
      <Flex direction="column" gap="1">
        <Heading as="h1" size="6">
          후속 확인
        </Heading>
        <Text size="2" color="gray">
          날짜가 덜 발표된 콜라보는 수집기가 3 → 7 → 14 → 30일 간격으로 다시 확인합니다. 초안은 바로 고쳐지고, 검수 중·발행된 콜라보는 여기서
          반영 여부를 정합니다.
        </Text>
      </Flex>
      <TabNav.Root>
        {VIEWS.map((v) => (
          <TabNav.Link key={v.view} asChild active={v.view === view}>
            <Link href={v.view === 'proposals' ? '/admin/followups' : `/admin/followups?view=${v.view}`}>
              <LinkPending />
              {v.label}
            </Link>
          </TabNav.Link>
        ))}
      </TabNav.Root>
      {unavailable ? (
        <Callout.Root color="amber" role="status">
          <Callout.Text>{unavailable}</Callout.Text>
        </Callout.Root>
      ) : items.length === 0 ? (
        <Text color="gray" size="2">
          {current.empty}
        </Text>
      ) : (
        <div className="ct-admin-cards ct-pending-target">
          {items.map((item) => (
            <FollowUpCard key={item.id} item={item} view={view} />
          ))}
        </div>
      )}
    </Flex>
  );
}

function FollowUpCard({ item, view }: { item: FollowUpItem; view: FollowUpView }) {
  const editorHref = `/admin?${new URLSearchParams({ ...(item.status === 'draft' || item.status === 'in_review' ? {} : { status: item.status }), id: item.id })}`;
  return (
    <Card size="2">
      <Flex direction="column" gap="3">
        <Flex justify="between" align="start" gap="3" wrap="wrap">
          <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
            <Flex gap="1" wrap="wrap">
              <Badge size="1" variant="soft" color={item.status === 'published' ? 'grass' : 'gray'}>
                {STATUS_LABEL[item.status]}
              </Badge>
              {item.reason && (
                <Badge size="1" variant="soft" color="amber">
                  {FOLLOW_UP_REASON_LABEL[item.reason]}
                </Badge>
              )}
              {item.escalated && (
                <Badge size="1" variant="soft" color="red">
                  알림
                </Badge>
              )}
            </Flex>
            <Text weight="bold">{item.title}</Text>
            <Text size="1" color="gray" className="ct-mono">
              {item.slug}
            </Text>
          </Flex>
          <Button asChild size="1" variant="soft" color="gray">
            <Link href={editorHref}>
              <LinkPending />
              편집기에서 열기
            </Link>
          </Button>
        </Flex>

        {view === 'proposals' && item.proposal ? (
          <ProposalDiff item={item} />
        ) : (
          <DataList.Root size="1">
            <DataList.Item>
              <DataList.Label>기간</DataList.Label>
              <DataList.Value className="ct-mono">{adminPeriodLabel(item.period)}</DataList.Value>
            </DataList.Item>
            {item.reason && (
              <DataList.Item>
                <DataList.Label>할 일</DataList.Label>
                <DataList.Value>{FOLLOW_UP_REASON_HINT[item.reason]}</DataList.Value>
              </DataList.Item>
            )}
            <DataList.Item>
              <DataList.Label>확인</DataList.Label>
              <DataList.Value>
                마지막 {day(item.lastCheckedAt)} · 다음 {day(item.nextCheckAt)} · 연속 무변화 {item.unchanged}회
                {view === 'escalated' && ` (${ESCALATE_AFTER}회부터 알림)`}
              </DataList.Value>
            </DataList.Item>
          </DataList.Root>
        )}
      </Flex>
    </Card>
  );
}

function ProposalDiff({ item }: { item: FollowUpItem }) {
  const p = item.proposal!;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<'apply' | 'dismiss' | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 제안 이후에 다른 수정이 있었다면 반영 전에 알린다(반영은 지금 rev로 하므로 덮어쓸 수 있다)
  const changedSince = item.rev !== p.rev;

  function act(action: 'apply' | 'dismiss') {
    setError(null);
    setBusy(action);
    start(async () => {
      const res = await resolveFollowUp(item.id, action, action === 'apply' ? item.rev : undefined);
      setBusy(null);
      if (!res.ok) {
        const fields = res.error.fields ? ` (${Object.entries(res.error.fields).map(([k, v]) => `${k}: ${v}`).join(', ')})` : '';
        return setError(`${res.error.message ?? res.error.code}${fields}`);
      }
      router.refresh();
    });
  }

  return (
    <Flex direction="column" gap="3">
      <DataList.Root size="1">
        {p.period && (
          <DataList.Item>
            <DataList.Label>기간</DataList.Label>
            <DataList.Value>
              <Flex direction="column" gap="1">
                <Text color="gray" className="ct-mono" style={{ textDecoration: 'line-through' }}>
                  {adminPeriodLabel(item.period)}
                </Text>
                <Text weight="bold" className="ct-mono">
                  {adminPeriodLabel(p.period)}
                </Text>
              </Flex>
            </DataList.Value>
          </DataList.Item>
        )}
        {p.i18n &&
          (['ko', 'en'] as const).map((l) => (
            <DataList.Item key={l}>
              <DataList.Label>{l === 'ko' ? '한국어' : '영어'}</DataList.Label>
              <DataList.Value>
                <Flex direction="column" gap="1">
                  {(item.text[l].title !== p.i18n![l].title || item.text[l].summary !== p.i18n![l].summary) && (
                    <Text color="gray" size="1" style={{ textDecoration: 'line-through' }}>
                      {item.text[l].title} — {item.text[l].summary || '(요약 없음)'}
                    </Text>
                  )}
                  <Text size="2">
                    <strong>{p.i18n![l].title}</strong> — {p.i18n![l].summary}
                  </Text>
                </Flex>
              </DataList.Value>
            </DataList.Item>
          ))}
        <DataList.Item>
          <DataList.Label>근거</DataList.Label>
          <DataList.Value>
            <Flex direction="column" gap="1">
              {p.sources.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noreferrer noopener" style={{ wordBreak: 'break-all' }}>
                  {s.title || s.url} <ExternalLinkIcon aria-label="새 창" />
                </a>
              ))}
            </Flex>
          </DataList.Value>
        </DataList.Item>
        {p.note && (
          <DataList.Item>
            <DataList.Label>메모</DataList.Label>
            <DataList.Value>{p.note}</DataList.Value>
          </DataList.Item>
        )}
        <DataList.Item>
          <DataList.Label>제안</DataList.Label>
          <DataList.Value>
            {day(p.at)} · <span className="ct-mono">{p.by}</span>
          </DataList.Value>
        </DataList.Item>
      </DataList.Root>
      {changedSince && (
        <Callout.Root color="amber" size="1">
          <Callout.Text>제안 이후 이 콜라보가 수정되었습니다(rev {p.rev} → {item.rev}). 편집기에서 지금 값을 확인한 뒤 반영하세요.</Callout.Text>
        </Callout.Root>
      )}
      {error && (
        <Callout.Root color="red" size="1" role="alert">
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}
      <Flex gap="2" justify="end">
        <Button variant="soft" color="gray" onClick={() => act('dismiss')} disabled={pending} loading={busy === 'dismiss'}>
          <TrashIcon /> 버리기
        </Button>
        <Button onClick={() => act('apply')} disabled={pending} loading={busy === 'apply'}>
          <CheckIcon /> 반영
        </Button>
      </Flex>
    </Flex>
  );
}
