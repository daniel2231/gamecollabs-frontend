import { ImageIcon } from '@radix-ui/react-icons';
import { Button, Flex, Text } from '@radix-ui/themes';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { CollabEditor } from '@/components/admin/CollabEditor';
import { QueueList } from '@/components/admin/QueueList';
import { QueueSearch } from '@/components/admin/QueueSearch';
import { LinkPending } from '@/components/site/Pending';
import { Link } from '@/i18n/navigation';
import { adminApi } from '@/lib/api';
import type { QueueFilter } from '@/lib/api/types';
import { loadEntityLists, loadTrees, pickEntityNames } from '@/lib/admin-data';
import { getAdminSession } from '@/lib/auth/session';
import { COLLAB_STATUSES, ORIGIN_TYPES, type CollabStatus, type OriginType } from '@/schema';

const STATUS_TITLE = { review: '검수 대기', draft: '초안', in_review: '검수 요청됨', published: '발행됨', archived: '보관' } as const;
const ORIGIN_FILTERS: { value?: OriginType; label: string }[] = [
  { label: '전체' },
  { value: 'gpt', label: 'GPT 수집' },
  { value: 'agent', label: '에이전트' },
  { value: 'manual', label: '수동' },
];

export default async function AdminQueuePage({ params, searchParams }: PageProps<'/[locale]/admin'>) {
  const { locale } = await params;
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);
  const sp = await searchParams;
  const status = (COLLAB_STATUSES as readonly string[]).includes(String(sp.status)) ? (sp.status as CollabStatus) : 'review';
  const origin = (ORIGIN_TYPES as readonly string[]).includes(String(sp.origin)) ? (sp.origin as OriginType) : undefined;
  const cover = sp.cover === 'missing' ? ('missing' as const) : undefined;
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 100) : '';
  const admin = adminApi(session.token);
  // 서로 기다릴 필요 없는 조회는 한꺼번에 시작한다. 선택 항목은 id가 있으면 큐와 함께 읽고,
  // 없으면 큐의 첫 항목을 고른 뒤 읽는다
  const requestedId = typeof sp.id === 'string' ? sp.id : undefined;
  const entityLists = loadEntityLists(admin);
  entityLists.catch(() => {}); // 쓰지 않고 끝나는 경우의 unhandled rejection 방지. 쓸 때는 await에서 오류가 난다
  const filter: QueueFilter = { status, origin, cover, q: q || undefined };
  const [queue, trees, requested] = await Promise.all([
    admin.listQueue(filter),
    loadTrees(),
    requestedId ? admin.getCollab(requestedId) : null,
  ]);
  const selectedId = requestedId ?? queue.items[0]?.id;
  const collab = requestedId ? requested : selectedId ? await admin.getCollab(selectedId) : null;
  const entities = collab ? pickEntityNames(await entityLists, collab) : {};

  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status: status === 'review' ? undefined : status, origin, cover, q: q || undefined, ...extra };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/admin?${s}` : '/admin';
  };

  return (
    <>
      <section aria-label={`${STATUS_TITLE[status]} 목록`} className="ct-admin-queue">
        <Flex direction="column" gap="3" p="4" style={{ borderBottom: '1px solid var(--ct-line)' }}>
          <Flex align="baseline" justify="between" gap="2">
            <Text size="4" weight="bold">
              {STATUS_TITLE[status]}
            </Text>
            <Text size="1" color="gray">
              {/* 조건이 없으면 상태별 전체 건수, 있으면 불러온 건수(더 있으면 +) */}
              {origin || cover || q
                ? `${cover ? '커버 없음 ' : ''}${queue.items.length}건${queue.nextCursor ? ' 이상' : ''}`
                : `${queue.counts[status]}건`}
            </Text>
          </Flex>
          <Suspense fallback={<div style={{ height: 32 }} />}>
            <QueueSearch q={q} scopeLabel={STATUS_TITLE[status]} />
          </Suspense>
          <Flex role="group" aria-label="출처 필터" wrap="wrap" gap="2">
            {ORIGIN_FILTERS.map((f) => (
              <Button key={f.label} asChild size="1" radius="full" variant={origin === f.value ? 'solid' : 'surface'} color="gray" highContrast={origin === f.value}>
                <Link href={qs({ origin: f.value })} aria-current={origin === f.value ? 'true' : undefined}>
                  <LinkPending scope="list" />
                  {f.label}
                </Link>
              </Button>
            ))}
          </Flex>
          {/* 커버 없는 것만: 상태·출처 필터와 함께 쓴다 */}
          <div>
            <Button asChild size="1" radius="full" variant={cover ? 'solid' : 'surface'} color={cover ? 'amber' : 'gray'}>
              <Link href={qs({ cover: cover ? undefined : 'missing' })} aria-pressed={Boolean(cover)}>
                <LinkPending scope="list" />
                <ImageIcon aria-hidden="true" />
                커버 없음만
              </Link>
            </Button>
          </div>
        </Flex>
        <QueueList
          key={JSON.stringify(filter)}
          items={queue.items}
          nextCursor={queue.nextCursor}
          filter={filter}
          query={Object.fromEntries(new URLSearchParams(qs({}).split('?')[1] ?? ''))}
          selectedId={collab?.id ?? null}
          emptyMessage={
            q ? `“${q}” 검색 결과가 없습니다. 다른 상태에서 찾아보거나 검색어를 줄여 보세요.` : cover ? '커버가 없는 항목이 없습니다.' : '항목이 없습니다.'
          }
        />
      </section>
      <main className="ct-admin-main ct-pending-target">
        {collab ? (
          <CollabEditor key={collab.id} collab={collab} trees={trees} entities={entities} locale={locale} />
        ) : (
          <Flex direction="column" align="start" gap="3" py="9">
            <Text color="gray">{selectedId ? '항목을 찾을 수 없습니다.' : '검수할 항목을 고르세요.'}</Text>
            <Button asChild>
              <Link href="/admin/new">+ 새 콜라보</Link>
            </Button>
          </Flex>
        )}
      </main>
    </>
  );
}
