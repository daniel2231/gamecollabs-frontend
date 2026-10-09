'use client';

import {
  CheckIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  ExternalLinkIcon,
  PlusIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import {
  AlertDialog,
  Badge,
  Button,
  Callout,
  Card,
  Checkbox,
  Dialog,
  Flex,
  Heading,
  IconButton,
  Select,
  SegmentedControl,
  Table,
  Text,
  TextArea,
  TextField,
  Tooltip,
  VisuallyHidden,
} from '@radix-ui/themes';
import { useMemo, useState, useTransition } from 'react';
import { getCollabForCompare, saveCollab, transitionCollab } from '@/app/[locale]/admin/actions';
import { useRouter } from '@/i18n/navigation';
import type { TermNode } from '@/lib/taxonomy';
import { flatten } from '@/lib/taxonomy';
import {
  COMPANY_ROLES,
  SOURCE_TYPES,
  type AdminCollab,
  type CollabInput,
  type CompanyRole,
  type Period,
  type Transition,
} from '@/schema';
import { EntityCombobox, type EntityChoice } from './EntityCombobox';
import type { KindOption } from './EntityFormDialog';
import { slugify } from './EntityFormDialog';
import { TermMultiSelect } from './TermMultiSelect';

export type Trees = Record<'category' | 'region' | 'platform' | 'collab_type' | 'partner_category', TermNode[]>;

type Props = {
  collab: AdminCollab | null;
  trees: Trees;
  entities: Record<string, EntityChoice>;
  locale: string;
};

const ROLE_LABEL: Record<CompanyRole, string> = {
  publisher: '퍼블리셔',
  developer: '개발사',
  licensor: 'IP 홀더',
  brand_partner: '브랜드 파트너',
  organizer: '주최',
  unspecified: '역할 미지정',
};
const SOURCE_LABEL = { official: '공식', press: '보도', social: '소셜', store: '스토어' } as const;
const STATUS_LABEL = { draft: '초안', in_review: '검수 요청됨', published: '발행됨', archived: '보관' } as const;
const ORIGIN_LABEL = { manual: '수동', gpt: 'GPT 수집', agent: '에이전트', migration: '이관' } as const;

type SourceRow = CollabInput['sources'][number] & { key: string };
type CompanyRow = { key: string; entity: EntityChoice | null; role: CompanyRole };

const today = () => new Date().toISOString().slice(0, 10);
const blankSource = (primary: boolean): SourceRow => ({
  key: crypto.randomUUID(),
  url: '',
  title: '',
  publisher: '',
  type: 'official',
  isPrimary: primary,
  accessedAt: today(),
});

function initialState(collab: AdminCollab | null, entities: Record<string, EntityChoice>) {
  const party = (role: 'host' | 'partner') => {
    const id = collab?.parties.find((p) => p.role === role)?.propertyId;
    return id ? (entities[id] ?? { id, slug: id, label: id, category: null }) : null;
  };
  return {
    slug: collab?.slug ?? '',
    ko: { title: '', summary: '', note: '', ...collab?.i18n.ko },
    en: { title: '', summary: '', note: '', ...collab?.i18n.en },
    host: party('host'),
    partner: party('partner'),
    companies: (collab?.companies ?? []).map<CompanyRow>((c) => ({
      key: crypto.randomUUID(),
      entity: entities[c.companyId] ?? { id: c.companyId, slug: c.companyId, label: c.companyId, category: null },
      role: c.role,
    })),
    category: collab?.category ?? null,
    regions: collab?.regions ?? [],
    platforms: collab?.platforms ?? [],
    collabTypes: collab?.collabTypes ?? [],
    period: collab?.period ?? ({ start: null, end: null, precision: 'day', endKind: 'tba' } satisfies Period),
    sources: collab?.sources.length
      ? collab.sources.map((s) => ({ ...s, key: crypto.randomUUID() }))
      : [blankSource(true)],
  };
}

type FormState = ReturnType<typeof initialState>;

export function CollabEditor({ collab, trees, entities, locale }: Props) {
  const router = useRouter();
  const [form, setFormState] = useState<FormState>(() => initialState(collab, entities));
  const [rev, setRev] = useState(collab?.rev ?? null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<{ code: string; message?: string; fields?: Record<string, string> } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [slugTouched, setSlugTouched] = useState(Boolean(collab));

  const setForm = (update: Partial<FormState> | ((f: FormState) => FormState)) => {
    setFormState((f) => (typeof update === 'function' ? update(f) : { ...f, ...update }));
    setDirty(true);
    setNotice(null);
  };

  const kindOptions: KindOption[] = flatten(trees.partner_category).map((n) => ({ key: n.key, label: n.label }));
  const partnerKindLabel = form.partner?.category
    ? (flatten(trees.partner_category).find((n) => n.key === form.partner!.category)?.label ?? form.partner.category)
    : null;
  const status = collab?.status ?? 'draft';

  // 원본은 보존하고, 사람이 해당 필드를 채우면 해결된 것으로 본다
  const unresolved = (collab?.unmapped ?? []).filter((u) => {
    const v = form[u.field as 'platforms' | 'regions' | 'collabTypes' | 'category'];
    return Array.isArray(v) ? v.length === 0 : !v;
  });

  const checks = useMemo(() => {
    const hasSource = form.sources.some((s) => s.url.trim());
    const required = Boolean(form.ko.title.trim() && form.slug && form.host && form.partner);
    return [
      { ok: hasSource, label: '출처 1개 이상', blocking: true },
      { ok: required, label: required ? '필수 필드' : '필수 필드 누락', blocking: true },
      { ok: unresolved.length === 0, label: unresolved.length ? `분류 매핑 ${unresolved.length}건 미해결` : '분류 매핑', blocking: true },
      { ok: Boolean(form.en.summary.trim() && form.en.title.trim() && form.ko.summary.trim()), label: '한·영 제목·요약', blocking: true },
    ];
  }, [form, unresolved.length]);
  const unlinked = (collab?.parties ?? []).filter((p) => !p.propertyId && !(p.role === 'host' ? form.host : form.partner));
  const canPublish = checks.every((c) => c.ok || !c.blocking) && (status === 'draft' || status === 'in_review');

  function toInput(): CollabInput {
    const sources = form.sources.filter((s) => s.url.trim());
    const hasPrimary = sources.some((s) => s.isPrimary);
    return {
      slug: form.slug.trim(),
      i18n: { ko: form.ko, en: form.en },
      parties: [
        ...(form.host ? [{ propertyId: form.host.id, role: 'host' as const }] : []),
        ...(form.partner ? [{ propertyId: form.partner.id, role: 'partner' as const }] : []),
      ],
      companies: form.companies.flatMap((c) => (c.entity ? [{ companyId: c.entity.id, role: c.role }] : [])),
      category: form.category,
      regions: form.regions,
      platforms: form.platforms,
      collabTypes: form.collabTypes,
      period: normalizePeriod(form.period),
      sources: sources.map(({ key: _key, ...s }, i) => ({ ...s, url: s.url.trim(), isPrimary: hasPrimary ? s.isPrimary : i === 0 })),
    };
  }

  async function persist(): Promise<AdminCollab | null> {
    const res = await saveCollab(collab?.id ?? null, toInput(), rev);
    if (!res.ok) {
      setError(res.error);
      return null;
    }
    setError(null);
    setRev(res.data.rev);
    setDirty(false);
    return res.data;
  }

  function onSave() {
    start(async () => {
      const saved = await persist();
      if (!saved) return;
      setNotice('저장했습니다');
      if (!collab) router.push(`/admin?id=${saved.id}`);
      else router.refresh();
    });
  }

  function onTransition(action: Transition, reason?: string) {
    start(async () => {
      if (dirty || !collab) {
        const saved = await persist();
        if (!saved) return;
        if (!collab) {
          router.push(`/admin?id=${saved.id}`);
          return;
        }
      }
      const res = await transitionCollab(collab.id, action, reason);
      if (!res.ok) return setError(res.error);
      setError(null);
      setRev(res.data.rev);
      setNotice({ submit: '검수 요청했습니다', publish: '발행했습니다', archive: '보관했습니다' }[action]);
      // 상태가 바뀌어 목록에서 빠져도 방금 처리한 항목을 계속 보여준다
      const sp = new URLSearchParams(window.location.search);
      sp.set('id', collab.id);
      router.replace(`/admin?${sp}`, { scroll: false });
      router.refresh();
    });
  }

  const fieldError = (key: string) =>
    error?.fields?.[key] ? (
      <span className="ct-error-text" role="alert">
        {error.fields[key]}
      </span>
    ) : null;

  return (
    <Flex direction="column" gap="5">
      {/* 머리말 */}
      <Flex wrap="wrap" align="start" justify="between" gap="4">
        <Flex direction="column" gap="2" style={{ minWidth: 0 }}>
          <Flex wrap="wrap" align="center" gap="2">
            <Badge color={status === 'published' ? 'grass' : status === 'in_review' ? 'indigo' : 'gray'} variant="soft">
              {STATUS_LABEL[status]}
            </Badge>
            {collab && (
              <Text size="1" color="gray">
                {ORIGIN_LABEL[collab.origin.type]}
                {collab.origin.runId && (
                  <>
                    {' · run '}
                    <span className="ct-mono">{collab.origin.runId}</span>
                  </>
                )}
                {collab.origin.confidence !== null && ` · 신뢰도 ${collab.origin.confidence.toFixed(2)}`}
                {' · '}
                <span className="ct-mono">rev {rev}</span>
              </Text>
            )}
            {dirty && (
              <Badge color="amber" variant="soft">
                저장 안 됨
              </Badge>
            )}
          </Flex>
          <Heading as="h1" size="6">
            {form.ko.title || (collab ? collab.slug : '새 콜라보')}
          </Heading>
          {status === 'published' && collab && (
            <Text size="2">
              <a href={`/${locale}/collabs/${collab.slug}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-11)' }}>
                공개 페이지 보기 <ExternalLinkIcon style={{ verticalAlign: 'middle' }} />
              </a>
            </Text>
          )}
        </Flex>
        <Flex wrap="wrap" gap="2">
          {collab && status !== 'archived' && <ArchiveButton disabled={pending} onConfirm={(reason) => onTransition('archive', reason)} published={status === 'published'} />}
          <Button variant="surface" color="gray" onClick={onSave} loading={pending} disabled={!dirty && Boolean(collab)}>
            {collab ? '임시 저장' : '초안 만들기'}
          </Button>
          {status === 'draft' && collab && (
            <Button variant="soft" onClick={() => onTransition('submit')} disabled={pending}>
              검수 요청
            </Button>
          )}
          {collab && (status === 'draft' || status === 'in_review') && (
            <Tooltip content={canPublish ? '저장 후 발행합니다' : '발행 조건을 먼저 충족하세요'}>
              <Button onClick={() => onTransition('publish')} disabled={!canPublish || pending} aria-describedby="publish-checklist">
                발행
              </Button>
            </Tooltip>
          )}
        </Flex>
      </Flex>

      {notice && (
        <Callout.Root color="grass" size="1" role="status">
          <Callout.Icon>
            <CheckIcon />
          </Callout.Icon>
          <Callout.Text>{notice}</Callout.Text>
        </Callout.Root>
      )}
      {error && (
        <Callout.Root color="red" size="1" role="alert">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            {error.message ?? (error.code === 'validation_failed' ? '입력값을 확인하세요' : error.code)}
            {error.fields && (
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {Object.entries(error.fields).map(([k, v]) => (
                  <li key={k}>
                    <span className="ct-mono">{k}</span>: {v}
                  </li>
                ))}
              </ul>
            )}
          </Callout.Text>
        </Callout.Root>
      )}

      {collab && collab.duplicates.length > 0 && (
        <Callout.Root color="amber" role="status">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Flex wrap="wrap" align="center" gap="3" style={{ gridColumn: '2' }}>
            <Callout.Text style={{ flex: '1 1 300px' }}>
              중복 후보 {collab.duplicates.length}건 —{' '}
              {collab.duplicates.map((d, i) => (
                <span key={d.id}>
                  {i > 0 && ', '}
                  <strong className="ct-mono">{d.slug}</strong> ({d.reason === 'same_source' ? '같은 출처 URL' : '같은 작품 쌍, 시작일 ±14일'})
                </span>
              ))}
            </Callout.Text>
            <CompareDialog current={collab} otherId={collab.duplicates[0]!.id} />
          </Flex>
        </Callout.Root>
      )}

      <section id="publish-checklist" aria-label="발행 조건" className="ct-checklist">
        {checks.map((c) => (
          <Flex
            key={c.label}
            gap="2"
            align="center"
            p="3"
            style={{
              borderRadius: 'var(--radius-2)',
              background: c.ok ? 'var(--grass-a3)' : c.blocking ? 'var(--red-a3)' : 'var(--amber-a3)',
              color: c.ok ? 'var(--grass-11)' : c.blocking ? 'var(--red-11)' : 'var(--amber-11)',
            }}
          >
            {c.ok ? <CheckIcon aria-label="충족" /> : <Cross2Icon aria-label={c.blocking ? '미충족' : '경고'} />}
            <Text size="2">
              {c.label}
              {!c.ok && !c.blocking && ' (발행 가능)'}
            </Text>
          </Flex>
        ))}
      </section>

      <Card size="3">
        <Flex direction="column" gap="6">
          <FormSection title="제목·slug">
            <div className="ct-two">
              <Text as="label" className="ct-field">
                <span className="ct-label">한국어 제목 *</span>
                <TextField.Root
                  value={form.ko.title}
                  aria-invalid={Boolean(error?.fields?.['i18n.ko.title']) || undefined}
                  onChange={(e) => setForm((f) => ({ ...f, ko: { ...f.ko, title: e.target.value } }))}
                />
                {fieldError('i18n.ko.title')}
              </Text>
              <Text as="label" className="ct-field">
                <span className="ct-label">English title</span>
                <TextField.Root
                  value={form.en.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((f) => ({ ...f, en: { ...f.en, title }, slug: slugTouched ? f.slug : slugify(title) }));
                  }}
                />
              </Text>
            </div>
            <Text as="label" className="ct-field" mt="3">
              <span className="ct-label">slug * (기존 MDX id 유지, 공개 URL에 쓰임)</span>
              <TextField.Root
                className="ct-mono"
                value={form.slug}
                aria-invalid={Boolean(error?.fields?.slug) || undefined}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm({ slug: e.target.value });
                }}
              />
              {fieldError('slug')}
            </Text>
          </FormSection>

          <FormSection title="요약">
            <div className="ct-two">
              <Text as="label" className="ct-field">
                <span className="ct-label">한국어</span>
                <TextArea rows={4} value={form.ko.summary} onChange={(e) => setForm((f) => ({ ...f, ko: { ...f.ko, summary: e.target.value } }))} />
              </Text>
              <Text as="label" className="ct-field">
                <span className="ct-label">English</span>
                <TextArea rows={4} value={form.en.summary} onChange={(e) => setForm((f) => ({ ...f, en: { ...f.en, summary: e.target.value } }))} />
              </Text>
            </div>
          </FormSection>

          <FormSection title="참여 작품">
            <div className="ct-two" style={{ alignItems: 'start' }}>
              <EntityCombobox kind="property" label="호스트 (게임) *" value={form.host} onChange={(host) => setForm({ host })} kindOptions={kindOptions} invalid={Boolean(error?.fields?.parties) && !form.host} />
              <div>
                <EntityCombobox kind="property" label="파트너 *" value={form.partner} onChange={(partner) => setForm({ partner })} kindOptions={kindOptions} invalid={Boolean(error?.fields?.parties) && !form.partner} />
                {partnerKindLabel && (
                  <Text as="p" size="1" color="gray" mt="1" mb="0">
                    파트너 분류: {partnerKindLabel} (작품의 분류에서 자동 결정)
                  </Text>
                )}
              </div>
            </div>
            {fieldError('parties')}
            {unlinked.length > 0 && (
              <Callout.Root color="amber" size="1" mt="2">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>
                  아직 작품에 연결되지 않은 수집 이름:{' '}
                  {unlinked.map((p) => `${p.role === 'host' ? '호스트' : '파트너'} “${p.name?.ko || p.name?.en}”`).join(', ')}. 위에서
                  기존 작품을 고르거나 새로 만들어 연결하세요. 고르기 전까지는 수집된 이름이 그대로 보존됩니다.
                </Callout.Text>
              </Callout.Root>
            )}
          </FormSection>

          <FormSection title="참여 회사">
            <Flex direction="column" gap="3">
              {form.companies.map((row, i) => (
                <Flex key={row.key} gap="2" align="end" wrap="wrap">
                  <div style={{ flex: '1 1 240px' }}>
                    <EntityCombobox
                      kind="company"
                      label={`회사 ${i + 1}`}
                      value={row.entity}
                      kindOptions={kindOptions}
                      onChange={(entity) => setForm((f) => ({ ...f, companies: f.companies.map((c) => (c.key === row.key ? { ...c, entity } : c)) }))}
                    />
                  </div>
                  <div className="ct-field" style={{ flex: '0 1 180px' }}>
                    <span className="ct-label">역할</span>
                    <Select.Root value={row.role} onValueChange={(role) => setForm((f) => ({ ...f, companies: f.companies.map((c) => (c.key === row.key ? { ...c, role: role as CompanyRole } : c)) }))}>
                      <Select.Trigger aria-label={`회사 ${i + 1} 역할`} />
                      <Select.Content position="popper">
                        {COMPANY_ROLES.map((r) => (
                          <Select.Item key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </div>
                  <IconButton variant="soft" color="gray" aria-label={`회사 ${i + 1} 삭제`} onClick={() => setForm((f) => ({ ...f, companies: f.companies.filter((c) => c.key !== row.key) }))}>
                    <TrashIcon />
                  </IconButton>
                </Flex>
              ))}
              <div>
                <Button variant="soft" color="gray" size="2" onClick={() => setForm((f) => ({ ...f, companies: [...f.companies, { key: crypto.randomUUID(), entity: null, role: 'publisher' }] }))}>
                  <PlusIcon /> 회사 추가
                </Button>
              </div>
            </Flex>
          </FormSection>

          <FormSection title="기간">
            <PeriodFields period={form.period} onChange={(period) => setForm({ period })} />
          </FormSection>

          <FormSection title="분류" hint="taxonomy_terms 키만 선택 가능">
            {(collab?.unmappedOther.length ?? 0) > 0 && (
              <Text as="p" size="1" color="gray" mt="0" mb="3">
                참고용 수집 원본값: {collab!.unmappedOther.map((u) => `${u.field} “${u.raw}”`).join(', ')}
              </Text>
            )}
            <div className="ct-two">
              <div className="ct-field">
                <span className="ct-label">카테고리</span>
                <Select.Root value={form.category ?? '__none'} onValueChange={(v) => setForm({ category: v === '__none' ? null : v })}>
                  <Select.Trigger aria-label="카테고리" />
                  <Select.Content position="popper">
                    <Select.Item value="__none">선택 안 함</Select.Item>
                    {flatten(trees.category).map((n) => (
                      <Select.Item key={n.key} value={n.key}>
                        {n.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                {unresolved.some((u) => u.field === 'category') && (
                  <span className="ct-error-text">
                    수집 원본값 {unresolved.filter((u) => u.field === 'category').map((r) => `“${r.raw}”`).join(', ')} 매핑 실패 — 원본은 보존됨
                  </span>
                )}
                {fieldError('category')}
              </div>
              {(
                [
                  ['regions', '권역', trees.region],
                  ['platforms', '플랫폼', trees.platform],
                  ['collabTypes', '콜라보 유형', trees.collab_type],
                ] as const
              ).map(([field, label, tree]) => {
                const raw = unresolved.filter((u) => u.field === field);
                return (
                  <div key={field}>
                    <TermMultiSelect
                      label={label}
                      tree={tree}
                      value={form[field]}
                      onChange={(v) => setForm({ [field]: v })}
                      invalid={raw.length > 0 || Boolean(error?.fields?.[field])}
                      describedBy={raw.length ? `${field}-unmapped` : undefined}
                    />
                    {raw.length > 0 && (
                      <span id={`${field}-unmapped`} className="ct-error-text">
                        수집 원본값 {raw.map((r) => `“${r.raw}”`).join(', ')} 매핑 실패 — 원본은 보존됨
                      </span>
                    )}
                    {fieldError(field)}
                  </div>
                );
              })}
            </div>
          </FormSection>

          <FormSection title="출처" hint="최소 1개, 주 출처 1개">
            <SourcesEditor
              rows={form.sources}
              status={new Map((collab?.sourceStatus ?? []).map((s) => [s.url, s.httpStatus]))}
              onChange={(sources) => setForm({ sources })}
            />
            {fieldError('sources')}
          </FormSection>
        </Flex>
      </Card>
    </Flex>
  );
}

function normalizePeriod(p: Period): Period {
  if (p.precision === 'unknown') return { ...p, start: null, end: p.endKind === 'fixed' ? p.end : null };
  const fix = (d: string | null) => (d && p.precision === 'month' ? `${d.slice(0, 7)}-01` : d);
  return { ...p, start: fix(p.start), end: p.endKind === 'fixed' ? fix(p.end) : null };
}

function FormSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
      <legend style={{ padding: '0 0 12px' }}>
        <Text weight="bold">{title}</Text>
        {hint && (
          <Text size="2" color="gray">
            {' '}
            — {hint}
          </Text>
        )}
      </legend>
      {children}
    </fieldset>
  );
}

function PeriodFields({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  const inputType = period.precision === 'month' ? 'month' : 'date';
  const shown = (d: string | null) => (d ? (inputType === 'month' ? d.slice(0, 7) : d) : '');
  const parse = (v: string) => (v ? (inputType === 'month' ? `${v}-01` : v) : null);
  return (
    <Flex wrap="wrap" gap="4" align="end">
      <div className="ct-field">
        <span className="ct-label">정확도</span>
        <Select.Root value={period.precision} onValueChange={(precision) => onChange({ ...period, precision: precision as Period['precision'] })}>
          <Select.Trigger aria-label="날짜 정확도" />
          <Select.Content position="popper">
            <Select.Item value="day">일 단위</Select.Item>
            <Select.Item value="month">월 단위</Select.Item>
            <Select.Item value="unknown">미상</Select.Item>
          </Select.Content>
        </Select.Root>
      </div>
      {period.precision !== 'unknown' && (
        <Text as="label" className="ct-field">
          <span className="ct-label">시작일</span>
          <TextField.Root type={inputType} className="ct-mono" value={shown(period.start)} onChange={(e) => onChange({ ...period, start: parse(e.target.value) })} style={{ colorScheme: 'dark' }} />
        </Text>
      )}
      <div className="ct-field">
        <span className="ct-label" id="endkind-label">
          종료 구분
        </span>
        <SegmentedControl.Root value={period.endKind} onValueChange={(endKind) => onChange({ ...period, endKind: endKind as Period['endKind'] })} aria-labelledby="endkind-label">
          <SegmentedControl.Item value="fixed">종료일 지정</SegmentedControl.Item>
          <SegmentedControl.Item value="permanent">상시</SegmentedControl.Item>
          <SegmentedControl.Item value="tba">미발표</SegmentedControl.Item>
        </SegmentedControl.Root>
      </div>
      {period.endKind === 'fixed' && period.precision !== 'unknown' && (
        <Text as="label" className="ct-field">
          <span className="ct-label">종료일</span>
          <TextField.Root type={inputType} className="ct-mono" value={shown(period.end)} onChange={(e) => onChange({ ...period, end: parse(e.target.value) })} style={{ colorScheme: 'dark' }} />
        </Text>
      )}
    </Flex>
  );
}

function SourcesEditor({ rows, status, onChange }: { rows: SourceRow[]; status: Map<string, number | null>; onChange: (rows: SourceRow[]) => void }) {
  const update = (key: string, patch: Partial<SourceRow>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  return (
    <Flex direction="column" gap="3">
      <Table.Root variant="surface" size="1" style={{ overflowX: 'auto' }}>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell width="48px">주</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell minWidth="280px">URL · 제목 · 발행처</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell width="120px">유형</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell width="80px">상태</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell width="160px">확인일</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell width="48px">
              <VisuallyHidden>삭제</VisuallyHidden>
            </Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((r, i) => {
            const http = status.get(r.url);
            return (
              <Table.Row key={r.key} align="center">
                <Table.Cell>
                  <input
                    type="radio"
                    name="primary-source"
                    aria-label={`출처 ${i + 1}을 주 출처로`}
                    checked={r.isPrimary}
                    onChange={() => onChange(rows.map((x) => ({ ...x, isPrimary: x.key === r.key })))}
                    style={{ accentColor: 'var(--accent-9)' }}
                  />
                </Table.Cell>
                <Table.Cell>
                  <Flex direction="column" gap="1">
                    <TextField.Root size="1" type="url" className="ct-mono" placeholder="https://" aria-label={`출처 ${i + 1} URL`} value={r.url} onChange={(e) => update(r.key, { url: e.target.value })} />
                    <Flex gap="1">
                      <TextField.Root size="1" placeholder="제목" aria-label={`출처 ${i + 1} 제목`} value={r.title} onChange={(e) => update(r.key, { title: e.target.value })} style={{ flex: 2 }} />
                      <TextField.Root size="1" placeholder="발행처" aria-label={`출처 ${i + 1} 발행처`} value={r.publisher} onChange={(e) => update(r.key, { publisher: e.target.value })} style={{ flex: 1 }} />
                    </Flex>
                  </Flex>
                </Table.Cell>
                <Table.Cell>
                  <Select.Root size="1" value={r.type} onValueChange={(type) => update(r.key, { type: type as SourceRow['type'] })}>
                    <Select.Trigger aria-label={`출처 ${i + 1} 유형`} />
                    <Select.Content position="popper">
                      {SOURCE_TYPES.map((t) => (
                        <Select.Item key={t} value={t}>
                          {SOURCE_LABEL[t]}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Table.Cell>
                <Table.Cell>
                  {http == null ? (
                    <Text size="1" color="gray">
                      미확인
                    </Text>
                  ) : (
                    <Badge className="ct-mono" color={http < 400 ? 'grass' : 'red'} variant="soft">
                      {http}
                    </Badge>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <TextField.Root size="1" type="date" className="ct-mono" aria-label={`출처 ${i + 1} 확인일`} value={r.accessedAt} onChange={(e) => update(r.key, { accessedAt: e.target.value })} style={{ colorScheme: 'dark' }} />
                </Table.Cell>
                <Table.Cell>
                  <IconButton size="1" variant="ghost" color="gray" aria-label={`출처 ${i + 1} 삭제`} onClick={() => onChange(rows.filter((x) => x.key !== r.key))} disabled={rows.length === 1}>
                    <TrashIcon />
                  </IconButton>
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
      <div>
        <Button variant="soft" color="gray" size="2" onClick={() => onChange([...rows, blankSource(rows.length === 0)])}>
          <PlusIcon /> 출처 추가
        </Button>
      </div>
    </Flex>
  );
}

function ArchiveButton({ onConfirm, disabled, published }: { onConfirm: (reason: string) => void; disabled: boolean; published: boolean }) {
  const [reason, setReason] = useState('');
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>
        <Button variant="surface" color="red" disabled={disabled}>
          {published ? '보관…' : '폐기…'}
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="440px">
        <AlertDialog.Title>{published ? '보관할까요?' : '이 초안을 폐기할까요?'}</AlertDialog.Title>
        <AlertDialog.Description size="2">
          {published ? '공개 페이지에서 내려가고 보관 목록으로 옮겨집니다.' : '보관 상태로 옮겨집니다. 폐기 사유는 수집 프롬프트 개선에 쓰입니다.'}
        </AlertDialog.Description>
        <Text as="label" className="ct-field" mt="3">
          <span className="ct-label">사유</span>
          <TextArea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 공식 발표 아님, 중복, 날짜 오류" />
        </Text>
        <Flex gap="2" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              취소
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button color="red" onClick={() => onConfirm(reason)}>
              {published ? '보관' : '폐기'}
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}

function CompareDialog({ current, otherId }: { current: AdminCollab; otherId: string }) {
  const [other, setOther] = useState<AdminCollab | null>(null);
  const [failed, setFailed] = useState(false);
  const rows: [string, (c: AdminCollab) => string][] = [
    ['상태', (c) => STATUS_LABEL[c.status]],
    ['제목', (c) => c.i18n.ko.title],
    ['slug', (c) => c.slug],
    ['기간', (c) => `${c.period.start ?? '미상'} ~ ${c.period.endKind === 'fixed' ? (c.period.end ?? '') : c.period.endKind}`],
    ['작품', (c) => c.parties.map((p) => `${p.role}:${p.propertyId}`).join(', ')],
    ['출처', (c) => c.sources.map((s) => s.url).join('\n')],
  ];
  return (
    <Dialog.Root
      onOpenChange={async (open) => {
        if (!open || other) return;
        const res = await getCollabForCompare(otherId);
        if (res.ok && res.data) setOther(res.data);
        else setFailed(true);
      }}
    >
      <Dialog.Trigger>
        <Button size="1" variant="surface" color="amber">
          나란히 비교
        </Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="860px">
        <Dialog.Title>중복 후보 비교</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="3">
          같은 콜라보라면 이 초안을 폐기하고 기존 항목을 수정하세요.
        </Dialog.Description>
        {failed ? (
          <Text color="red">불러오지 못했습니다.</Text>
        ) : (
          <Table.Root variant="surface" size="1">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell width="80px" />
                <Table.ColumnHeaderCell>이 초안</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>기존 항목</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map(([label, get]) => {
                const a = get(current);
                const b = other ? get(other) : '…';
                return (
                  <Table.Row key={label}>
                    <Table.RowHeaderCell>{label}</Table.RowHeaderCell>
                    <Table.Cell style={{ whiteSpace: 'pre-line', wordBreak: 'break-all', background: other && a === b ? 'var(--amber-a2)' : undefined }}>{a}</Table.Cell>
                    <Table.Cell style={{ whiteSpace: 'pre-line', wordBreak: 'break-all', background: other && a === b ? 'var(--amber-a2)' : undefined }}>{b}</Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        )}
        <Flex justify="end" mt="4">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              닫기
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
