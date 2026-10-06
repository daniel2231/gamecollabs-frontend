'use client';

import { PlusIcon } from '@radix-ui/react-icons';
import { Badge, Button, Callout, Card, Dialog, Flex, Heading, Select, Table, Text, TextField } from '@radix-ui/themes';
import { useState, useTransition } from 'react';
import { createTerm } from '@/app/[locale]/admin/actions';
import { useRouter } from '@/i18n/navigation';
import { TAXONOMIES, type Taxonomy, type TaxonomyTerm } from '@/schema';

const TAXONOMY_LABEL: Record<Taxonomy, string> = {
  category: '카테고리',
  partner_category: '파트너 분류',
  region: '권역',
  platform: '플랫폼',
  collab_type: '콜라보 유형',
};

/** F-06: 통제 어휘. 새 값 추가는 관리자 전용, ko/en 라벨 필수 */
export function TaxonomyManager({ terms }: { terms: TaxonomyTerm[] }) {
  const [adding, setAdding] = useState<Taxonomy | null>(null);
  return (
    <Flex direction="column" gap="5">
      <Flex direction="column" gap="1">
        <Heading as="h1" size="6">
          분류 어휘
        </Heading>
        <Text size="2" color="gray">
          콜라보의 분류값은 여기 있는 키만 쓸 수 있습니다. 상위 키를 고르면 필터에서 하위 항목이 함께 포함됩니다.
        </Text>
      </Flex>
      {TAXONOMIES.map((tax) => {
        const list = terms.filter((t) => t.taxonomy === tax);
        const ordered = order(list);
        return (
          <Card key={tax} size="2">
            <Flex justify="between" align="center" mb="3">
              <Heading as="h2" size="4">
                {TAXONOMY_LABEL[tax]} <Text size="2" color="gray" className="ct-mono">{tax}</Text>
              </Heading>
              <Button size="1" variant="soft" onClick={() => setAdding(tax)}>
                <PlusIcon /> 추가
              </Button>
            </Flex>
            <Table.Root size="1">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>키</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>한국어</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>English</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>기존 표기</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {ordered.map(({ term, depth }) => (
                  <Table.Row key={term.key}>
                    <Table.Cell className="ct-mono" style={{ paddingLeft: 12 + depth * 20 }}>
                      {term.key}
                      {term.deprecated && (
                        <Badge color="gray" ml="2">
                          폐기
                        </Badge>
                      )}
                    </Table.Cell>
                    <Table.Cell>{term.label.ko}</Table.Cell>
                    <Table.Cell>{term.label.en}</Table.Cell>
                    <Table.Cell>
                      <Flex wrap="wrap" gap="1">
                        {term.legacyValues.map((v) => (
                          <Badge key={v} color="gray" variant="soft">
                            {v}
                          </Badge>
                        ))}
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card>
        );
      })}
      {adding && <AddTermDialog taxonomy={adding} terms={terms.filter((t) => t.taxonomy === adding)} onClose={() => setAdding(null)} />}
    </Flex>
  );
}

function order(list: TaxonomyTerm[]): { term: TaxonomyTerm; depth: number }[] {
  const walk = (parent: string | null, depth: number): { term: TaxonomyTerm; depth: number }[] =>
    list
      .filter((t) => t.parent === parent)
      .sort((a, b) => a.order - b.order)
      .flatMap((t) => [{ term: t, depth }, ...walk(t.key, depth + 1)]);
  return walk(null, 0);
}

function AddTermDialog({ taxonomy, terms, onClose }: { taxonomy: Taxonomy; terms: TaxonomyTerm[]; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ suffix: '', parent: '', ko: '', en: '', legacy: '' });
  const [error, setError] = useState<{ message?: string; fields?: Record<string, string> } | null>(null);
  const [pending, start] = useTransition();
  const prefix = form.parent || taxonomy;
  const key = `${prefix}.${form.suffix}`;
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="480px">
        <Dialog.Title>{TAXONOMY_LABEL[taxonomy]} 항목 추가</Dialog.Title>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await createTerm({
                key,
                taxonomy,
                parent: form.parent || null,
                label: { ko: form.ko, en: form.en },
                legacyValues: form.legacy.split(',').map((s) => s.trim()).filter(Boolean),
              });
              if (!res.ok) return setError(res.error);
              router.refresh();
              onClose();
            });
          }}
        >
          <Flex direction="column" gap="3" mt="3">
            <div className="ct-field">
              <span className="ct-label">상위 항목</span>
              <Select.Root value={form.parent || '__root'} onValueChange={(v) => setForm({ ...form, parent: v === '__root' ? '' : v })}>
                <Select.Trigger aria-label="상위 항목" />
                <Select.Content position="popper">
                  <Select.Item value="__root">없음 (최상위)</Select.Item>
                  {terms.map((t) => (
                    <Select.Item key={t.key} value={t.key}>
                      {t.label.ko} — {t.key}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
            <Text as="label" className="ct-field">
              <span className="ct-label">키 이름 (소문자·숫자·밑줄)</span>
              <TextField.Root className="ct-mono" required pattern="[a-z0-9_]+" value={form.suffix} onChange={(e) => setForm({ ...form, suffix: e.target.value })}>
                <TextField.Slot>
                  <Text size="1" color="gray" className="ct-mono">
                    {prefix}.
                  </Text>
                </TextField.Slot>
              </TextField.Root>
              {error?.fields?.key && <span className="ct-error-text">{error.fields.key}</span>}
            </Text>
            <div className="ct-two">
              <Text as="label" className="ct-field">
                <span className="ct-label">한국어 라벨</span>
                <TextField.Root required value={form.ko} onChange={(e) => setForm({ ...form, ko: e.target.value })} />
              </Text>
              <Text as="label" className="ct-field">
                <span className="ct-label">English label</span>
                <TextField.Root required value={form.en} onChange={(e) => setForm({ ...form, en: e.target.value })} />
              </Text>
            </div>
            <Text as="label" className="ct-field">
              <span className="ct-label">기존 표기 (쉼표 구분, 이관·입력 정규화에 사용)</span>
              <TextField.Root value={form.legacy} onChange={(e) => setForm({ ...form, legacy: e.target.value })} />
            </Text>
            {error && !error.fields?.key && (
              <Callout.Root color="red" size="1">
                <Callout.Text>{error.message ?? Object.values(error.fields ?? {}).join(', ')}</Callout.Text>
              </Callout.Root>
            )}
            <Flex justify="end" gap="2" mt="2">
              <Dialog.Close>
                <Button type="button" variant="soft" color="gray">
                  취소
                </Button>
              </Dialog.Close>
              <Button type="submit" loading={pending}>
                추가
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
