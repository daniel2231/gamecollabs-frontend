'use client';

import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { AlertDialog, Avatar, Badge, Button, Callout, Card, Flex, Heading, Table, TabNav, Text, TextField } from '@radix-ui/themes';
import { useState, useTransition } from 'react';
import { deleteMember, setMemberActive } from '@/app/[locale]/admin/actions';
import { LinkPending } from '@/components/site/Pending';
import { Link, useRouter } from '@/i18n/navigation';
import type { MemberList } from '@/lib/api/types';
import type { AdminMember, MemberStats, MemberStatusFilter } from '@/schema';

const STATUS_TABS: { status: MemberStatusFilter; label: string }[] = [
  { status: 'all', label: '전체' },
  { status: 'active', label: '활성' },
  { status: 'disabled', label: '차단됨' },
];

function href(q: string, status: MemberStatusFilter, cursor?: string) {
  const sp = new URLSearchParams({ ...(q ? { q } : {}), ...(status === 'all' ? {} : { status }), ...(cursor ? { cursor } : {}) });
  return `/admin/members${sp.size ? `?${sp}` : ''}`;
}

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '—');

/** 아바타 해시 → Discord CDN 주소(없으면 기본 아바타) */
function avatarUrl(m: AdminMember) {
  if (m.avatar) return `https://cdn.discordapp.com/avatars/${m.discordId}/${m.avatar}.png?size=64`;
  return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(m.discordId) >> 22n) % 6n)}.png`;
}

type Props = {
  stats: MemberStats | string;
  /** forbidden: 편집자(목록은 관리자만), 문자열: 오류 메시지 */
  list: MemberList | 'forbidden' | string;
  q: string;
  status: MemberStatusFilter;
  paged: boolean;
};

export function MembersBoard({ stats, list, q, status, paged }: Props) {
  return (
    <Flex direction="column" gap="5">
      <Flex direction="column" gap="1">
        <Heading as="h1" size="6">
          회원
        </Heading>
        <Text size="2" color="gray">
          Discord로 로그인한 방문자입니다. 통계는 개인정보 없이 숫자만 보여 줍니다.
        </Text>
      </Flex>
      {typeof stats === 'string' ? (
        <Callout.Root color="amber" size="1">
          <Callout.Text>{stats}</Callout.Text>
        </Callout.Root>
      ) : (
        <StatsPanel stats={stats} />
      )}
      {list === 'forbidden' ? (
        <Callout.Root color="gray" size="1">
          <Callout.Text>회원 목록과 차단·삭제는 관리자(admin)만 쓸 수 있습니다.</Callout.Text>
        </Callout.Root>
      ) : typeof list === 'string' ? (
        <Callout.Root color="red" size="1" role="alert">
          <Callout.Text>{list}</Callout.Text>
        </Callout.Root>
      ) : (
        <MemberTable list={list} q={q} status={status} paged={paged} />
      )}
    </Flex>
  );
}

function StatsPanel({ stats }: { stats: MemberStats }) {
  const m = stats.members;
  const max = Math.max(1, ...stats.weekly.map((w) => w.signups));
  const tiles = [
    { label: '전체 회원', value: m.total, hint: m.disabled ? `차단 ${m.disabled}` : null },
    { label: '최근 7일 가입', value: m.new7d, hint: `30일 ${m.new30d}` },
    { label: '30일 내 로그인', value: m.active30d, hint: m.total ? `${Math.round((m.active30d / m.total) * 100)}%` : null },
    { label: '전체 저장', value: stats.bookmarks, hint: `전체 팔로우 ${stats.follows}` },
  ];
  return (
    <Flex direction="column" gap="4">
      <div className="ct-admin-stat-tiles">
        {tiles.map((t) => (
          <Card key={t.label} size="2">
            <Text as="div" size="1" color="gray">
              {t.label}
            </Text>
            <Text as="div" size="6" weight="bold" className="ct-mono">
              {t.value.toLocaleString('ko-KR')}
            </Text>
            {t.hint && (
              <Text as="div" size="1" color="gray">
                {t.hint}
              </Text>
            )}
          </Card>
        ))}
      </div>
      <Card size="2">
        <Text as="div" size="2" weight="medium" mb="3">
          주별 가입 (최근 12주, 월요일 기준)
        </Text>
        <div className="ct-admin-bars" role="img" aria-label={`주별 가입: ${stats.weekly.map((w) => `${w.week} ${w.signups}명`).join(', ')}`}>
          {stats.weekly.map((w) => (
            <div key={w.week} className="ct-admin-bar" title={`${w.week} 주: ${w.signups}명`}>
              <span className="ct-mono">{w.signups || ''}</span>
              <div style={{ height: `${(w.signups / max) * 100}%` }} />
              <span className="ct-mono">{w.week.slice(5)}</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="ct-admin-two">
        <Card size="2">
          <Text as="div" size="2" weight="medium" mb="2">
            많이 저장된 콜라보
          </Text>
          {stats.topSaved.length === 0 ? (
            <Text size="2" color="gray">
              아직 없습니다.
            </Text>
          ) : (
            <ol className="ct-admin-rank">
              {stats.topSaved.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin?status=${c.status}&id=${c.id}`}>{c.title}</Link>
                  {c.status !== 'published' && (
                    <Badge size="1" color="gray" variant="soft">
                      {c.status === 'archived' ? '보관' : c.status}
                    </Badge>
                  )}
                  <span className="ct-mono">{c.count}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card size="2">
          <Text as="div" size="2" weight="medium" mb="2">
            많이 팔로우된 작품·회사
          </Text>
          {stats.topFollowed.length === 0 ? (
            <Text size="2" color="gray">
              아직 없습니다.
            </Text>
          ) : (
            <ol className="ct-admin-rank">
              {stats.topFollowed.map((e) => (
                <li key={`${e.type}:${e.id}`}>
                  <a href={`/ko/${e.type === 'property' ? 'properties' : 'companies'}/${e.slug}`} target="_blank" rel="noreferrer">
                    {e.name}
                  </a>
                  <Badge size="1" color="gray" variant="soft">
                    {e.type === 'property' ? '작품' : '회사'}
                  </Badge>
                  <span className="ct-mono">{e.count}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </Flex>
  );
}

function MemberTable({ list, q, status, paged }: { list: MemberList; q: string; status: MemberStatusFilter; paged: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState(list.items);
  const [query, setQuery] = useState(q);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function toggle(m: AdminMember) {
    setBusy(m.id);
    setError(null);
    const res = await setMemberActive(m.id, !m.active);
    setBusy(null);
    if (!res.ok) return setError(res.error.message ?? '처리하지 못했습니다');
    setItems((xs) => xs.map((x) => (x.id === m.id ? res.data : x)));
  }

  async function remove(m: AdminMember) {
    setBusy(m.id);
    setError(null);
    const res = await deleteMember(m.id);
    setBusy(null);
    if (!res.ok) return setError(res.error.message ?? '삭제하지 못했습니다');
    setItems((xs) => xs.filter((x) => x.id !== m.id));
    startTransition(() => router.refresh());
  }

  return (
    <Flex direction="column" gap="3">
      <Flex gap="3" wrap="wrap" align="center" justify="between">
        <TabNav.Root>
          {STATUS_TABS.map((t) => (
            <TabNav.Link key={t.status} asChild active={t.status === status}>
              <Link href={href(q, t.status)}>
                <LinkPending />
                {t.label}
              </Link>
            </TabNav.Link>
          ))}
        </TabNav.Root>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            router.push(href(query.trim(), status));
          }}
          style={{ minWidth: 260 }}
        >
          <TextField.Root value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름 또는 Discord ID" aria-label="회원 검색">
            <TextField.Slot>
              <MagnifyingGlassIcon />
            </TextField.Slot>
          </TextField.Root>
        </form>
      </Flex>
      <Text size="1" color="gray">
        {q ? `“${q}” 검색 결과 ` : ''}
        {list.total.toLocaleString('ko-KR')}명{paged ? ' · 이어서 보는 중' : ''}
      </Text>
      {error && (
        <Callout.Root color="red" size="1" role="alert">
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}
      {items.length === 0 ? (
        <Text size="2" color="gray">
          해당하는 회원이 없습니다.
        </Text>
      ) : (
        <Table.Root variant="surface" size="1">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>회원</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>가입</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>마지막 로그인</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell justify="end">저장</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell justify="end">팔로우</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell justify="end">관리</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items.map((m) => (
              <Table.Row key={m.id} align="center">
                <Table.RowHeaderCell>
                  <Flex align="center" gap="2">
                    <Avatar src={avatarUrl(m)} fallback={(m.globalName || m.username).charAt(0)} size="1" radius="full" />
                    <Flex direction="column">
                      <Text size="2" weight="medium">
                        {m.globalName || m.username}
                        {!m.active && (
                          <Badge color="red" variant="soft" size="1" ml="2">
                            차단됨
                          </Badge>
                        )}
                      </Text>
                      <Text size="1" color="gray" className="ct-mono">
                        @{m.username} · {m.discordId}
                      </Text>
                    </Flex>
                  </Flex>
                </Table.RowHeaderCell>
                <Table.Cell className="ct-mono">{day(m.createdAt)}</Table.Cell>
                <Table.Cell className="ct-mono">{day(m.lastLoginAt)}</Table.Cell>
                <Table.Cell justify="end" className="ct-mono">
                  {m.bookmarkCount}
                </Table.Cell>
                <Table.Cell justify="end" className="ct-mono">
                  {m.followCount}
                </Table.Cell>
                <Table.Cell justify="end">
                  <Flex gap="2" justify="end">
                    <Button size="1" variant="soft" color={m.active ? 'amber' : 'gray'} loading={busy === m.id} onClick={() => toggle(m)}>
                      {m.active ? '차단' : '해제'}
                    </Button>
                    <DeleteMemberButton member={m} disabled={busy === m.id} onConfirm={() => remove(m)} />
                  </Flex>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
      {list.nextCursor && (
        <Flex justify="center">
          <Button asChild variant="soft" color="gray">
            <Link href={href(q, status, list.nextCursor)}>
              <LinkPending />
              다음 50명
            </Link>
          </Button>
        </Flex>
      )}
    </Flex>
  );
}

function DeleteMemberButton({ member, disabled, onConfirm }: { member: AdminMember; disabled: boolean; onConfirm: () => void }) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>
        <Button size="1" variant="soft" color="red" disabled={disabled}>
          삭제
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="440px">
        <AlertDialog.Title>{member.globalName || member.username} 회원을 삭제할까요?</AlertDialog.Title>
        <AlertDialog.Description size="2">
          계정과 저장 {member.bookmarkCount}건, 팔로우 {member.followCount}개가 지워지며 되돌릴 수 없습니다. 같은 Discord 계정으로 다시 로그인하면 빈 계정으로
          새로 가입됩니다. 다시 들어오지 못하게 하려면 삭제 대신 차단하세요.
        </AlertDialog.Description>
        <Flex gap="2" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              취소
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button color="red" onClick={onConfirm}>
              삭제
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
