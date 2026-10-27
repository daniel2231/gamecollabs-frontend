'use client';

import { CheckIcon, ExternalLinkIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge, Button, Callout, Card, DataList, Flex, Heading, TabNav, Text } from '@radix-ui/themes';
import { useState, useTransition } from 'react';
import { resolveFollowUp } from '@/app/[locale]/admin/actions';
import { LinkPending } from '@/components/site/Pending';
import { Link, useRouter } from '@/i18n/navigation';
import { adminPeriodLabel, ESCALATE_AFTER, FOLLOW_UP_REASON_HINT, FOLLOW_UP_REASON_LABEL } from '@/lib/followup';
import type { FollowUpAction, FollowUpItem, FollowUpProposal, FollowUpView, Period } from '@/schema';

const VIEWS: { view: FollowUpView; label: string; empty: string }[] = [
  { view: 'proposals', label: '제안', empty: '처리할 재확인 제안이 없습니다.' },
  { view: 'applied', label: '자동 반영', empty: '확인하지 않은 자동 반영 변경이 없습니다.' },
  { view: 'escalated', label: '알림', empty: '결정이 필요한 콜라보가 없습니다.' },
  { view: 'queued', label: '확인 예정', empty: '재확인 중인 콜라보가 없습니다.' },
];

const STATUS_LABEL = { draft: '초안', in_review: '검수 요청됨', published: '발행됨', archived: '보관' } as const;

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '—');

type Props = { view: FollowUpView; items: FollowUpItem[]; unavailable?: string };

/**
 * 후속 확인(날짜나 내용이 덜 발표된 콜라보 재확인) 관리 화면.
 * 제안: 수집기가 검수 중·발행된 콜라보에서 찾은 변경 → 반영 또는 버리기.
 * 자동 반영: 수집기가 초안에 바로 반영한 변경 → 바뀐 내용을 보고 확인 처리.
 * 알림: 여러 번 확인해도 소식이 없음 → 편집기에서 날짜를 넣거나 “상시”로 바꾸거나 보관.
 * 확인 예정: 재확인 중인 전체를 다음 확인일 순으로(참고용). 차례가 된 것은 “지금 차례”로 표시한다.
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
          날짜나 내용이 덜 발표된 콜라보는 수집기가 3 → 7 → 14 → 30일 간격으로 다시 확인합니다. 초안은 바로 고쳐져 “자동 반영”에 남고, 검수 중·발행된
          콜라보는 “제안”에서 반영 여부를 정합니다.
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
              {item.contentTba && item.reason !== 'content_tba' && (
                <Badge size="1" variant="soft" color="amber">
                  {FOLLOW_UP_REASON_LABEL.content_tba}
                </Badge>
              )}
              {item.escalated && (
                <Badge size="1" variant="soft" color="red">
                  알림
                </Badge>
              )}
              {view === 'queued' &&
                (item.proposal ? (
                  <Badge size="1" variant="soft" color="gray">
                    제안 처리 대기
                  </Badge>
                ) : (
                  item.nextCheckAt &&
                  Date.parse(item.nextCheckAt) <= Date.now() && (
                    <Badge size="1" variant="soft" color="blue">
                      지금 차례
                    </Badge>
                  )
                ))}
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
        ) : view === 'applied' && item.applied ? (
          <AppliedDiff item={item} />
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

type Shown = { period: Period; text: FollowUpItem['text']; contentTba: boolean };

/** 처리 버튼 하나(반영·버리기·확인)의 진행 상태와 오류. 끝나면 목록을 다시 읽는다 */
function useFollowUpAction(item: FollowUpItem) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<FollowUpAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  function act(action: FollowUpAction) {
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

  return { act, pending, busy, error };
}

/** 바뀌기 전(old) → 바뀐 값(change). 바뀐 항목만 보이고, 근거·메모·누가 언제 했는지를 붙인다 */
function ChangeList({ old, change, label }: { old: Shown; change: FollowUpProposal; label: string }) {
  return (
    <DataList.Root size="1">
      {change.period && (
        <DataList.Item>
          <DataList.Label>기간</DataList.Label>
          <DataList.Value>
            <Flex direction="column" gap="1">
              <Text color="gray" className="ct-mono" style={{ textDecoration: 'line-through' }}>
                {adminPeriodLabel(old.period)}
              </Text>
              <Text weight="bold" className="ct-mono">
                {adminPeriodLabel(change.period)}
              </Text>
            </Flex>
          </DataList.Value>
        </DataList.Item>
      )}
      {change.contentTba !== null && change.contentTba !== old.contentTba && (
        <DataList.Item>
          <DataList.Label>내용</DataList.Label>
          <DataList.Value>
            <Text weight="bold">{change.contentTba ? '내용 미발표로 표시' : '내용 발표됨 — “내용 미발표” 해제'}</Text>
          </DataList.Value>
        </DataList.Item>
      )}
      {change.i18n &&
        (['ko', 'en'] as const).map((l) => (
          <DataList.Item key={l}>
            <DataList.Label>{l === 'ko' ? '한국어' : '영어'}</DataList.Label>
            <DataList.Value>
              <Flex direction="column" gap="1">
                {(old.text[l].title !== change.i18n![l].title || old.text[l].summary !== change.i18n![l].summary) && (
                  <Text color="gray" size="1" style={{ textDecoration: 'line-through' }}>
                    {old.text[l].title} — {old.text[l].summary || '(요약 없음)'}
                  </Text>
                )}
                <Text size="2">
                  <strong>{change.i18n![l].title}</strong> — {change.i18n![l].summary}
                </Text>
              </Flex>
            </DataList.Value>
          </DataList.Item>
        ))}
      <DataList.Item>
        <DataList.Label>근거</DataList.Label>
        <DataList.Value>
          <Flex direction="column" gap="1">
            {change.sources.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer noopener" style={{ wordBreak: 'break-all' }}>
                {s.title || s.url} <ExternalLinkIcon aria-label="새 창" />
              </a>
            ))}
          </Flex>
        </DataList.Value>
      </DataList.Item>
      {change.note && (
        <DataList.Item>
          <DataList.Label>메모</DataList.Label>
          <DataList.Value>{change.note}</DataList.Value>
        </DataList.Item>
      )}
      <DataList.Item>
        <DataList.Label>{label}</DataList.Label>
        <DataList.Value>
          {day(change.at)} · <span className="ct-mono">{change.by}</span>
        </DataList.Value>
      </DataList.Item>
    </DataList.Root>
  );
}

function ProposalDiff({ item }: { item: FollowUpItem }) {
  const p = item.proposal!;
  const { act, pending, busy, error } = useFollowUpAction(item);
  // 제안 이후에 다른 수정이 있었다면 반영 전에 알린다(반영은 지금 rev로 하므로 덮어쓸 수 있다)
  const changedSince = item.rev !== p.rev;

  return (
    <Flex direction="column" gap="3">
      <ChangeList old={item} change={p} label="제안" />
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

/** 이미 반영된 변경: 처음 반영 전 값 → 수집기가 넣은 값. 틀렸으면 편집기에서 고치고 확인 처리한다 */
function AppliedDiff({ item }: { item: FollowUpItem }) {
  const a = item.applied!;
  const { act, pending, busy, error } = useFollowUpAction(item);

  return (
    <Flex direction="column" gap="3">
      <ChangeList old={a.before} change={a} label="반영" />
      {item.rev !== a.rev && (
        <Text size="1" color="gray">
          반영 후 다시 수정되었습니다(rev {a.rev} → {item.rev}).
        </Text>
      )}
      {error && (
        <Callout.Root color="red" size="1" role="alert">
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}
      <Flex gap="2" justify="end">
        <Button onClick={() => act('acknowledge')} disabled={pending} loading={busy === 'acknowledge'}>
          <CheckIcon /> 확인함
        </Button>
      </Flex>
    </Flex>
  );
}
