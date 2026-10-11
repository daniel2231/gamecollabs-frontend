import { ImageIcon } from '@radix-ui/react-icons';
import { Badge, Button, Flex, Text } from '@radix-ui/themes';
import { redirect } from 'next/navigation';
import { CollabEditor } from '@/components/admin/CollabEditor';
import { LinkPending } from '@/components/site/Pending';
import { Link } from '@/i18n/navigation';
import { adminApi } from '@/lib/api';
import { loadEntityLists, loadTrees, pickEntityNames } from '@/lib/admin-data';
import { getAdminSession } from '@/lib/auth/session';
import { COLLAB_STATUSES, ORIGIN_TYPES, type CollabStatus, type OriginType } from '@/schema';

const STATUS_TITLE = { review: '검수 대기', draft: '초안', in_review: '검수 요청됨', published: '발행됨', archived: '보관' } as const;
const STATUS_LABEL = { draft: 'draft', in_review: 'in_review', published: 'published', archived: 'archived' } as const;
const ORIGIN_FILTERS: { value?: OriginType; label: string }[] = [
  { label: '전체' },
  { value: 'gpt', label: 'GPT 수집' },
  { value: 'agent', label: '에이전트' },
  { value: 'manual', label: '수동' },
];

function relative(iso: string): string {
  const diff = (Date.now() - Date.parse(iso)) / 60000;
  if (diff < 60) return `${Math.max(1, Math.round(diff))}분 전`;
  if (diff < 60 * 24) return `${Math.round(diff / 60)}시간 전`;
  if (diff < 60 * 48) return '어제';
  return iso.slice(0, 10);
}

export default async function AdminQueuePage({ params, searchParams }: PageProps<'/[locale]/admin'>) {
  const { locale } = await params;
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);
  const sp = await searchParams;
  const status = (COLLAB_STATUSES as readonly string[]).includes(String(sp.status)) ? (sp.status as CollabStatus) : 'review';
  const origin = (ORIGIN_TYPES as readonly string[]).includes(String(sp.origin)) ? (sp.origin as OriginType) : undefined;
  const cover = sp.cover === 'missing' ? ('missing' as const) : undefined;
  const admin = adminApi(session.token);
  // 서로 기다릴 필요 없는 조회는 한꺼번에 시작한다. 선택 항목은 id가 있으면 큐와 함께 읽고,
  // 없으면 큐의 첫 항목을 고른 뒤 읽는다
  const requestedId = typeof sp.id === 'string' ? sp.id : undefined;
  const entityLists = loadEntityLists(admin);
  entityLists.catch(() => {}); // 쓰지 않고 끝나는 경우의 unhandled rejection 방지. 쓸 때는 await에서 오류가 난다
  const [queue, trees, requested] = await Promise.all([
    admin.listQueue({ status, origin, cover }),
    loadTrees(),
    requestedId ? admin.getCollab(requestedId) : null,
  ]);
  const selectedId = requestedId ?? queue.items[0]?.id;
  const collab = requestedId ? requested : selectedId ? await admin.getCollab(selectedId) : null;
  const entities = collab ? pickEntityNames(await entityLists, collab) : {};

  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status: status === 'review' ? undefined : status, origin, cover, ...extra };
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
              {cover ? `커버 없음 ${queue.items.length}건` : `${queue.items.length}건`}
            </Text>
          </Flex>
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
        {queue.items.length === 0 ? (
          <Text as="p" color="gray" size="2" m="4">
            {cover ? '커버가 없는 항목이 없습니다.' : '항목이 없습니다.'}
          </Text>
        ) : (
          <ul className="ct-pending-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {queue.items.map((q) => (
              <li key={q.id}>
                <Link href={qs({ id: q.id })} aria-current={q.id === collab?.id ? 'true' : undefined}>
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
                    {!cover && q.hasCover === false && (
                      <Badge size="1" variant="outline" color="gray">
                        커버 없음
                      </Badge>
                    )}
                  </Flex>
                  <Text weight="bold" size="2">
                    {q.title}
                  </Text>
                  <Text size="1" color="gray">
                    {relative(q.updatedAt)} · 출처 {q.sourceCount}
                  </Text>
                </Link>
              </li>
            ))}
          </ul>
        )}
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
