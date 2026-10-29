'use client';

import { ArrowDownIcon, ArrowUpIcon, Cross2Icon, DragHandleDots2Icon, MagnifyingGlassIcon, PlusIcon } from '@radix-ui/react-icons';
import { Badge, Button, Callout, Flex, Heading, IconButton, Table, Text, TextField } from '@radix-ui/themes';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { saveFeaturedOrder } from '@/app/[locale]/admin/actions';
import { useRouter } from '@/i18n/navigation';
import { FEATURED_SIZE } from '@/lib/featured';
import type { AdminEntity } from '@/schema';
import type { KindOption } from './EntityFormDialog';

type Props = {
  /** 모든 작품(노출 중인 것과 추가할 후보) */
  properties: AdminEntity[];
  /** 백엔드가 홈 노출을 지원하는지 */
  supported: boolean;
  kindOptions: KindOption[];
};

/** 저장된 노출 순서대로(같으면 한국어 이름순, 홈과 같은 규칙) */
function featuredOf(properties: AdminEntity[]) {
  return properties
    .filter((p) => p.featuredOrder != null)
    .sort((a, b) => a.featuredOrder! - b.featuredOrder! || a.name.ko.localeCompare(b.name.ko, 'ko') || a.slug.localeCompare(b.slug));
}

function matches(p: AdminEntity, q: string) {
  const needle = q.toLowerCase();
  return [p.name.ko, p.name.en, p.name.original ?? '', p.slug, ...p.aliases].some((v) => v.toLowerCase().includes(needle));
}

/** 홈 'IP로 찾아보기' 줄: 끌어서 순서를 바꾸고, 검색해서 추가하고, 저장하면 보이는 순서대로 1, 2, …가 매겨진다 */
export function FeaturedManager({ properties, supported, kindOptions }: Props) {
  const router = useRouter();
  const saved = useMemo(() => featuredOf(properties), [properties]);
  const [list, setList] = useState(saved);
  const [query, setQuery] = useState('');
  const [dragging, setDragging] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const kindLabel = new Map(kindOptions.map((o) => [o.key, o.label]));

  // 저장 후 새로 받은 목록으로 맞춘다
  useEffect(() => setList(saved), [saved]);

  const dirty = list.length !== saved.length || list.some((p, i) => p.id !== saved[i]!.id);

  // 저장하지 않은 순서를 두고 페이지를 떠나려 하면 묻는다
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const placed = new Set(list.map((p) => p.id));
  const q = query.trim();
  const candidates = q ? properties.filter((p) => !placed.has(p.id) && matches(p, q)).slice(0, 8) : [];

  // 홈은 콜라보가 있는 작품만 앞에서부터 FEATURED_SIZE개 보여준다
  let shown = 0;
  const visibility = list.map((p) => {
    if (p.collabCount === 0) return 'empty' as const;
    shown += 1;
    return shown <= FEATURED_SIZE ? ('shown' as const) : ('overflow' as const);
  });
  const firstOverflow = visibility.indexOf('overflow');

  function change(next: AdminEntity[]) {
    setList(next);
    setNotice(null);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= list.length || from === to) return;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    change(next);
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await saveFeaturedOrder(list.map((p) => p.id));
      if (!res.ok) return setError(res.error.message ?? res.error.code);
      setList(res.data);
      setNotice('저장했습니다. 홈에는 잠시 후 반영됩니다.');
      router.refresh();
    });
  }

  if (!supported) {
    return (
      <Flex direction="column" gap="4">
        <Heading as="h1" size="6">
          홈 노출
        </Heading>
        <Callout.Root color="amber" size="1">
          <Callout.Text>홈 ‘IP로 찾아보기’ 노출은 백엔드가 아직 지원하지 않아 여기서 설정할 수 없습니다.</Callout.Text>
        </Callout.Root>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center" wrap="wrap" gap="3">
        <div>
          <Heading as="h1" size="6">
            홈 노출
          </Heading>
          <Text as="p" size="2" color="gray" mt="1">
            홈 ‘IP로 찾아보기’에 보일 작품과 순서입니다. 끌어서 순서를 바꾸고 저장하세요. 콜라보가 있는 작품만 앞에서부터 {FEATURED_SIZE}개 보입니다.
          </Text>
        </div>
        <Flex gap="2">
          <Button variant="soft" color="gray" disabled={!dirty || pending} onClick={() => change(saved)}>
            되돌리기
          </Button>
          <Button disabled={!dirty} loading={pending} onClick={save}>
            저장
          </Button>
        </Flex>
      </Flex>

      {error && (
        <Callout.Root color="red" size="1">
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}
      {notice && !dirty && (
        <Callout.Root color="green" size="1">
          <Callout.Text>{notice}</Callout.Text>
        </Callout.Root>
      )}

      <div style={{ position: 'relative', maxWidth: 420 }}>
        <TextField.Root
          aria-label="추가할 작품 검색"
          placeholder="추가할 작품 검색 (이름·별칭·slug)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && candidates[0]) {
              e.preventDefault();
              change([...list, candidates[0]]);
              setQuery('');
            }
          }}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon />
          </TextField.Slot>
        </TextField.Root>
        {q && (
          <Flex direction="column" mt="2" gap="1">
            {candidates.map((p) => (
              <Flex key={p.id} align="center" justify="between" gap="2">
                <Text size="2">
                  {p.name.ko}{' '}
                  <Text color="gray" size="1">
                    {p.name.en} · 콜라보 {p.collabCount}
                  </Text>
                </Text>
                <Button
                  size="1"
                  variant="soft"
                  onClick={() => {
                    change([...list, p]);
                    setQuery('');
                  }}
                >
                  <PlusIcon /> 추가
                </Button>
              </Flex>
            ))}
            {candidates.length === 0 && (
              <Text size="2" color="gray">
                추가할 작품이 없습니다(이미 노출 중이거나 일치하는 작품 없음).
              </Text>
            )}
          </Flex>
        )}
      </div>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell width="72px">순서</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>작품</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>분류</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell justify="end">콜라보</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>
              <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>작업</span>
            </Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {list.map((p, i) => (
            <FeaturedRow
              key={p.id}
              property={p}
              index={i}
              count={list.length}
              kindLabel={kindLabel.get(p.category ?? '') ?? p.category}
              visibility={visibility[i]!}
              dividerBefore={i === firstOverflow}
              dragging={dragging === p.id}
              onDragStart={() => setDragging(p.id)}
              onDragEnter={() => {
                const from = list.findIndex((x) => x.id === dragging);
                if (from !== -1) move(from, i);
              }}
              onDragEnd={() => setDragging(null)}
              onMove={(to) => move(i, to)}
              onRemove={() => change(list.filter((x) => x.id !== p.id))}
            />
          ))}
          {list.length === 0 && (
            <Table.Row>
              <Table.Cell colSpan={5}>
                <Text color="gray">노출 중인 작품이 없습니다. 위에서 검색해 추가하세요.</Text>
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>
    </Flex>
  );
}

type RowProps = {
  property: AdminEntity;
  index: number;
  count: number;
  kindLabel: string | null;
  visibility: 'shown' | 'overflow' | 'empty';
  dividerBefore: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  onMove: (to: number) => void;
  onRemove: () => void;
};

function FeaturedRow({ property: p, index, count, kindLabel, visibility, dividerBefore, dragging, onDragStart, onDragEnter, onDragEnd, onMove, onRemove }: RowProps) {
  return (
    <>
      {dividerBefore && (
        <Table.Row>
          <Table.Cell colSpan={5} style={{ background: 'var(--gray-a3)' }}>
            <Text size="1" color="gray">
              여기부터는 홈에 보이지 않습니다({FEATURED_SIZE}개 초과)
            </Text>
          </Table.Cell>
        </Table.Row>
      )}
      <Table.Row
        align="center"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          // Firefox는 데이터가 없으면 끌기를 시작하지 않는다
          e.dataTransfer.setData('text/plain', p.id);
          onDragStart();
        }}
        onDragEnter={onDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        onDragEnd={onDragEnd}
        style={{ opacity: dragging ? 0.4 : visibility === 'shown' ? 1 : 0.6, cursor: 'grab' }}
      >
        <Table.Cell>
          <Flex align="center" gap="2">
            <DragHandleDots2Icon aria-hidden color="var(--gray-9)" />
            <Text className="ct-mono">{index + 1}</Text>
          </Flex>
        </Table.Cell>
        <Table.RowHeaderCell>
          <Flex align="center" gap="3">
            {p.image ? (
              <img
                src={p.image.url}
                alt=""
                width={32}
                height={40}
                referrerPolicy="no-referrer"
                draggable={false}
                style={{ objectFit: 'cover', borderRadius: 4, flex: 'none' }}
              />
            ) : (
              <span aria-hidden style={{ width: 32, height: 40, borderRadius: 4, background: 'var(--gray-a4)', flex: 'none' }} />
            )}
            <div>
              <Text weight="medium">{p.name.ko}</Text>
              <Text as="div" size="1" color="gray">
                {[p.name.en, p.name.original].filter(Boolean).join(' · ')}
              </Text>
            </div>
          </Flex>
        </Table.RowHeaderCell>
        <Table.Cell>{kindLabel}</Table.Cell>
        <Table.Cell justify="end">
          {visibility === 'empty' ? (
            <Badge color="gray" variant="soft" title="콜라보가 없는 작품은 홈에 나오지 않습니다">
              없음 · 홈에 안 보임
            </Badge>
          ) : (
            <Text className="ct-mono">{p.collabCount}</Text>
          )}
        </Table.Cell>
        <Table.Cell>
          <Flex gap="1" justify="end">
            <IconButton size="1" variant="soft" color="gray" aria-label={`${p.name.ko} 위로`} disabled={index === 0} onClick={() => onMove(index - 1)}>
              <ArrowUpIcon />
            </IconButton>
            <IconButton size="1" variant="soft" color="gray" aria-label={`${p.name.ko} 아래로`} disabled={index === count - 1} onClick={() => onMove(index + 1)}>
              <ArrowDownIcon />
            </IconButton>
            <IconButton size="1" variant="soft" color="red" aria-label={`${p.name.ko} 빼기`} onClick={onRemove}>
              <Cross2Icon />
            </IconButton>
          </Flex>
        </Table.Cell>
      </Table.Row>
    </>
  );
}
