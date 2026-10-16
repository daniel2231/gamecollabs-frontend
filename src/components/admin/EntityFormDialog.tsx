'use client';

import { Button, Callout, Dialog, Flex, Select, Switch, Text, TextField } from '@radix-ui/themes';
import { useEffect, useState, useTransition } from 'react';
import { saveEntity } from '@/app/[locale]/admin/actions';
import type { AdminEntity, EntityKind } from '@/schema';
import { CoverField } from './CoverField';

export type KindOption = { key: string; label: string };

type Props = {
  kind: EntityKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: AdminEntity | null;
  /** 새로 만들 때 이름 미리 채우기 */
  seedName?: string;
  kindOptions: KindOption[];
  onSaved: (entity: AdminEntity) => void;
};

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function EntityFormDialog({ kind, open, onOpenChange, initial, seedName, kindOptions, onSaved }: Props) {
  const [form, setForm] = useState(() => toForm(initial, seedName));
  const [error, setError] = useState<{ message?: string; fields?: Record<string, string> } | null>(null);
  const [pending, start] = useTransition();
  const label = kind === 'property' ? '작품' : '회사';

  useEffect(() => {
    if (open) {
      setForm(toForm(initial, seedName));
      setError(null);
    }
  }, [open, initial, seedName]);

  function submit() {
    start(async () => {
      const res = await saveEntity(kind, initial?.id ?? null, {
        slug: form.slug.trim(),
        name: { ko: form.ko.trim(), en: form.en.trim(), original: form.original.trim() || null },
        aliases: form.aliases.split(',').map((a) => a.trim()).filter(Boolean),
        category: kind === 'property' ? form.category || null : null,
        country: kind === 'company' ? form.country.trim().toUpperCase() || null : null,
        // 백엔드가 홈 노출 값을 알려주지 않았고 손대지도 않았으면 보내지 않는다(기존 값 유지)
        featuredOrder:
          kind !== 'property' || (initial?.featuredOrder === undefined && !form.featuredTouched)
            ? undefined
            : form.featured
              ? Number(form.featuredOrder)
              : null,
        image: kind === 'property' ? form.image : undefined,
      });
      if (res.ok) {
        onSaved(res.data);
        onOpenChange(false);
      } else setError(res.error);
    });
  }

  const fieldError = (k: string) => error?.fields?.[k] && <span className="ct-error-text">{error.fields[k]}</span>;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth={kind === 'property' ? '640px' : '520px'}>
        <Dialog.Title>{initial ? `${label} 수정` : `새 ${label}`}</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          별칭은 쉼표로 구분합니다. 중복 감지와 검색에 쓰입니다.
        </Dialog.Description>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Flex direction="column" gap="3">
            <div className="ct-two">
              <Field label="한국어 이름" error={fieldError('name.ko')}>
                <TextField.Root
                  value={form.ko}
                  required
                  onChange={(e) => setForm({ ...form, ko: e.target.value })}
                />
              </Field>
              <Field label="English *" error={fieldError('name.en')}>
                <TextField.Root
                  value={form.en}
                  onChange={(e) => {
                    const en = e.target.value;
                    setForm((f) => ({ ...f, en, slug: initial || f.slugTouched ? f.slug : slugify(en) }));
                  }}
                />
              </Field>
            </div>
            <div className="ct-two">
              <Field label="원어 표기">
                <TextField.Root value={form.original} onChange={(e) => setForm({ ...form, original: e.target.value })} />
              </Field>
              <Field label="slug" error={fieldError('slug')}>
                <TextField.Root
                  className="ct-mono"
                  value={form.slug}
                  required
                  onChange={(e) => setForm({ ...form, slug: e.target.value, slugTouched: true })}
                />
              </Field>
            </div>
            <Field label="별칭">
              <TextField.Root value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} placeholder="AoT, Shingeki no Kyojin" />
            </Field>
            {kind === 'property' ? (
              <Field label="분류 (partner_category)" error={fieldError('category')}>
                <Select.Root value={form.category || undefined} onValueChange={(category) => setForm({ ...form, category })}>
                  <Select.Trigger placeholder="분류 선택" />
                  <Select.Content position="popper">
                    {kindOptions.map((o) => (
                      <Select.Item key={o.key} value={o.key}>
                        {o.label} — <span className="ct-mono">{o.key}</span>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Field>
            ) : (
              <Field label="국가 (ISO 3166-1 alpha-2)" error={fieldError('country')}>
                <TextField.Root className="ct-mono" maxLength={2} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="JP" />
              </Field>
            )}
            {kind === 'property' && (
              <>
                <Flex direction="column" gap="2" pt="3" style={{ borderTop: '1px solid var(--gray-a5)' }}>
                  <Text as="label" size="2" weight="medium">
                    <Flex gap="2" align="center">
                      <Switch
                        checked={form.featured}
                        onCheckedChange={(featured) =>
                          setForm((f) => ({ ...f, featured, featuredTouched: true, featuredOrder: f.featuredOrder || '1' }))
                        }
                      />
                      홈 ‘IP로 찾아보기’에 노출
                    </Flex>
                  </Text>
                  {form.featured && (
                    <Field label="노출 순서 (작은 수가 앞)" error={fieldError('featuredOrder')}>
                      <TextField.Root
                        className="ct-mono"
                        type="number"
                        min={1}
                        max={999}
                        value={form.featuredOrder}
                        onChange={(e) => setForm({ ...form, featuredOrder: e.target.value, featuredTouched: true })}
                        style={{ maxWidth: 120 }}
                      />
                    </Field>
                  )}
                  <Text size="1" color="gray">
                    콜라보가 한 건도 없는 작품은 노출로 켜 두어도 홈에 나오지 않습니다.
                  </Text>
                </Flex>
                <Flex direction="column" gap="2">
                  <span className="ct-label">대표 이미지 (선택)</span>
                  <Text size="1" color="gray">
                    비워 두면 이 작품의 가장 최근 콜라보 커버를, 그것도 없으면 이름만 씁니다. 작품 자체의 공식 이미지는 권리 확인 후 올리세요.
                  </Text>
                  <CoverField
                    value={form.image}
                    onChange={(image) => setForm((f) => ({ ...f, image }))}
                    altFallback={{ ko: '작품 이름', en: 'the name' }}
                    frame={{ width: 4, height: 5, label: '홈 타일' }}
                  />
                  {fieldError('image')}
                </Flex>
              </>
            )}
            {error?.message && !error.fields && (
              <Callout.Root color="red" size="1">
                <Callout.Text>{error.message}</Callout.Text>
              </Callout.Root>
            )}
            <Flex justify="end" gap="2" mt="2">
              <Dialog.Close>
                <Button variant="soft" color="gray" type="button">
                  취소
                </Button>
              </Dialog.Close>
              <Button type="submit" loading={pending}>
                저장
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function Field({ label, error, children }: { label: string; error?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Text as="label" className="ct-field">
      <span className="ct-label">{label}</span>
      {children}
      {error}
    </Text>
  );
}

function toForm(e: AdminEntity | null | undefined, seedName?: string) {
  const isLatin = seedName ? /^[\x20-\x7e]+$/.test(seedName) : false;
  return {
    ko: e?.name.ko ?? (seedName && !isLatin ? seedName : ''),
    en: e?.name.en ?? (seedName && isLatin ? seedName : ''),
    original: e?.name.original ?? '',
    slug: e?.slug ?? (seedName && isLatin ? slugify(seedName) : ''),
    slugTouched: false,
    aliases: e?.aliases.join(', ') ?? '',
    category: e?.category ?? '',
    country: e?.country ?? '',
    featured: e?.featuredOrder != null,
    featuredOrder: e?.featuredOrder != null ? String(e.featuredOrder) : '',
    featuredTouched: false,
    /** undefined: 백엔드가 알려주지 않음(그대로 두면 기존 값 유지) */
    image: e ? e.image : null,
  };
}
