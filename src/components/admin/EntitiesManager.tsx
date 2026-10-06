'use client';

import { MagnifyingGlassIcon, PlusIcon } from '@radix-ui/react-icons';
import { AlertDialog, Badge, Button, Callout, Dialog, Flex, Heading, Table, TabNav, Text, TextField } from '@radix-ui/themes';
import { useState, useTransition } from 'react';
import { mergeEntities } from '@/app/[locale]/admin/actions';
import { Link, useRouter } from '@/i18n/navigation';
import type { AdminEntity, EntityKind } from '@/schema';
import { EntityCombobox, type EntityChoice } from './EntityCombobox';
import { EntityFormDialog, type KindOption } from './EntityFormDialog';

type Props = { kind: EntityKind; q: string; entities: AdminEntity[]; kindOptions: KindOption[] };

export function EntitiesManager({ kind, q, entities, kindOptions }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminEntity | null>(null);
  const [creating, setCreating] = useState(false);
  const [merging, setMerging] = useState<AdminEntity | null>(null);
  const [search, setSearch] = useState(q);
  const noun = kind === 'property' ? '작품' : '회사';
  const kindLabel = new Map(kindOptions.map((o) => [o.key, o.label]));

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center" wrap="wrap" gap="3">
        <Heading as="h1" size="6">
          작품·회사
        </Heading>
        <Button onClick={() => setCreating(true)}>
          <PlusIcon /> 새 {noun}
        </Button>
      </Flex>
      <TabNav.Root>
        <TabNav.Link asChild active={kind === 'property'}>
          <Link href="/admin/entities">작품 (게임·IP)</Link>
        </TabNav.Link>
        <TabNav.Link asChild active={kind === 'company'}>
          <Link href="/admin/entities?kind=company">회사</Link>
        </TabNav.Link>
      </TabNav.Root>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const p = new URLSearchParams();
          if (kind === 'company') p.set('kind', 'company');
          if (search.trim()) p.set('q', search.trim());
          router.replace(`/admin/entities${p.size ? `?${p}` : ''}`);
        }}
      >
        <TextField.Root aria-label={`${noun} 검색`} placeholder="이름·별칭·slug" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 360 }}>
          <TextField.Slot>
            <MagnifyingGlassIcon />
          </TextField.Slot>
        </TextField.Root>
      </form>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>이름</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>slug</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>별칭</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{kind === 'property' ? '분류' : '국가'}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell justify="end">콜라보</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>
              <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>작업</span>
            </Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {entities.map((e) => (
            <Table.Row key={e.id} align="center">
              <Table.RowHeaderCell>
                <Text weight="medium">{e.name.ko}</Text>
                <Text as="div" size="1" color="gray">
                  {[e.name.en, e.name.original].filter(Boolean).join(' · ')}
                </Text>
              </Table.RowHeaderCell>
              <Table.Cell className="ct-mono">{e.slug}</Table.Cell>
              <Table.Cell>
                <Flex wrap="wrap" gap="1">
                  {e.aliases.map((a) => (
                    <Badge key={a} color="gray" variant="soft">
                      {a}
                    </Badge>
                  ))}
                </Flex>
              </Table.Cell>
              <Table.Cell>{kind === 'property' ? (kindLabel.get(e.category ?? '') ?? e.category) : e.country}</Table.Cell>
              <Table.Cell justify="end" className="ct-mono">
                {e.collabCount}
              </Table.Cell>
              <Table.Cell>
                <Flex gap="2" justify="end">
                  <Button size="1" variant="soft" color="gray" onClick={() => setEditing(e)}>
                    수정
                  </Button>
                  <Button size="1" variant="soft" color="orange" onClick={() => setMerging(e)}>
                    병합…
                  </Button>
                </Flex>
              </Table.Cell>
            </Table.Row>
          ))}
          {entities.length === 0 && (
            <Table.Row>
              <Table.Cell colSpan={6}>
                <Text color="gray">결과가 없습니다.</Text>
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>

      <EntityFormDialog
        kind={kind}
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        initial={editing}
        kindOptions={kindOptions}
        onSaved={() => router.refresh()}
      />
      {merging && <MergeDialog kind={kind} source={merging} kindOptions={kindOptions} onClose={() => setMerging(null)} onMerged={() => router.refresh()} />}
    </Flex>
  );
}

/** F-05: 두 엔티티 병합. 원본의 이름·별칭은 대상의 별칭으로 흡수되고, 원본을 가리키던 콜라보는 대상으로 옮겨진다 */
function MergeDialog({ kind, source, kindOptions, onClose, onMerged }: { kind: EntityKind; source: AdminEntity; kindOptions: KindOption[]; onClose: () => void; onMerged: () => void }) {
  const [target, setTarget] = useState<EntityChoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="520px">
        <Dialog.Title>“{source.name.ko}” 병합</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          이 항목을 대상에 합칩니다. 콜라보 {source.collabCount}건이 대상으로 옮겨지고, 이름과 별칭은 대상의 별칭이 됩니다. 되돌릴 수 없습니다.
        </Dialog.Description>
        <EntityCombobox kind={kind} label="병합 대상" value={target} onChange={setTarget} kindOptions={kindOptions} />
        {target?.id === source.id && (
          <Text as="p" size="2" color="red" mt="2">
            같은 항목은 고를 수 없습니다.
          </Text>
        )}
        {error && (
          <Callout.Root color="red" size="1" mt="3">
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}
        <Flex justify="end" gap="2" mt="4">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              취소
            </Button>
          </Dialog.Close>
          <Button color="orange" disabled={!target || target.id === source.id} onClick={() => setConfirming(true)}>
            병합
          </Button>
        </Flex>
        <AlertDialog.Root open={confirming} onOpenChange={setConfirming}>
          <AlertDialog.Content maxWidth="420px">
            <AlertDialog.Title>정말 병합할까요?</AlertDialog.Title>
            <AlertDialog.Description size="2">
              “{source.name.ko}” → “{target?.label}”. 원본 항목은 삭제됩니다.
            </AlertDialog.Description>
            <Flex justify="end" gap="2" mt="4">
              <AlertDialog.Cancel>
                <Button variant="soft" color="gray">
                  취소
                </Button>
              </AlertDialog.Cancel>
              <Button
                color="orange"
                loading={pending}
                onClick={() =>
                  start(async () => {
                    const res = await mergeEntities(kind, source.id, target!.id);
                    setConfirming(false);
                    if (!res.ok) return setError(res.error.message ?? res.error.code);
                    onMerged();
                    onClose();
                  })
                }
              >
                병합
              </Button>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </Dialog.Content>
    </Dialog.Root>
  );
}
