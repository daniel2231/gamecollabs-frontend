'use client';

import { ChevronDownIcon, Cross2Icon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Button, Checkbox, Flex, IconButton, Link as RadixLink, Select, Text, TextField } from '@radix-ui/themes';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useOptimistic, useState, useTransition, type ReactNode } from 'react';
import { PendingMark } from '@/components/site/Pending';
import { useRouter } from '@/i18n/navigation';
import { EMPTY_FILTERS, hasFilterPanelValues, listHref, toggleFacet } from '@/lib/list-url';
import { countSelected, flatten, searchTree, type TermNode } from '@/lib/taxonomy';
import type { CollabQuery, FacetParam } from '@/schema';
import { useFilterUi } from './FilterUi';

/** 처음 보여 줄 상위 항목 수 */
const VISIBLE = 5;
/** 항목(하위 포함)이 이보다 많으면 찾기 상자를 둔다 */
const SEARCHABLE = 10;

type Props = {
  query: CollabQuery;
  facets: { param: FacetParam; tree: TermNode[] }[];
};

export function FilterPanel({ query, facets }: Props) {
  const t = useTranslations('List');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // 서버 응답을 기다리지 않고 체크 상태를 바로 바꾼다. 이동이 끝나면 서버 값으로 돌아온다
  const [optimistic, setOptimistic] = useOptimistic(query);
  const { open, setOpen, bodyId } = useFilterUi();

  function navigate(next: CollabQuery) {
    startTransition(() => {
      setOptimistic(next);
      router.replace(listHref(next), { scroll: false });
    });
  }

  return (
    // 좁은 화면에서는 닫혀 있으면 패널 전체를 숨기고, 여는 버튼(FilterToggle)은 결과 줄에 둔다
    <aside aria-label={t('filters')} className="ct-side ct-filter" data-open={open} aria-busy={pending} style={{ flexBasis: 248 }}>
      <PendingMark pending={pending} />
      <Flex align="center" justify="between" pb="2">
        <Text weight="bold">{t('filters')}</Text>
        <Flex gap="3" align="center">
          {hasFilterPanelValues(optimistic) && (
            <Button size="1" variant="ghost" color="gray" highContrast onClick={() => navigate({ ...optimistic, ...EMPTY_FILTERS, limit: 20 })}>
              {t('reset')}
            </Button>
          )}
          <Button className="ct-filter-close" size="1" variant="soft" color="gray" aria-controls={bodyId} onClick={() => setOpen(false)}>
            <Cross2Icon />
            {t('closeFilters')}
          </Button>
        </Flex>
      </Flex>

      <div id={bodyId} className="ct-filter-body">
        {facets.map(({ param, tree }) =>
          tree.length === 0 ? null : (
            <FacetGroup
              key={param}
              legend={t(`facet.${param}`)}
              tree={tree}
              selected={optimistic[param]}
              onToggle={(key) => navigate(toggleFacet(optimistic, param, key))}
              hint={param === 'platform' || param === 'region' ? t('hierarchyHint') : undefined}
            />
          ),
        )}

        <fieldset className="ct-fieldset">
          <legend>{t('period')}</legend>
          <Flex direction="column" gap="3">
            <MonthPicker key={`from-${optimistic.from ?? ""}`} label={t("from")} value={optimistic.from} onCommit={(from) => navigate({ ...optimistic, from, limit: 20 })} />
            <MonthPicker key={`to-${optimistic.to ?? ""}`} label={t("to")} value={optimistic.to} onCommit={(to) => navigate({ ...optimistic, to, limit: 20 })} />
          </Flex>
        </fieldset>
      </div>
    </aside>
  );
}

/**
 * 분류 하나의 체크 목록.
 * - 상위 항목만 먼저 보이고, 하위 항목은 화살표로 펼친다(하위에서 고른 것이 있으면 펼친 채로 시작)
 * - 상위 항목이 VISIBLE개보다 많으면 나머지는 '더 보기'로
 * - 항목이 SEARCHABLE개보다 많으면 위에 찾기 상자를 두고, 입력하면 일치하는 항목만 평평하게 보여준다
 */
function FacetGroup({
  legend,
  tree,
  selected,
  onToggle,
  hint,
}: {
  legend: string;
  tree: TermNode[];
  selected: string[];
  onToggle: (key: string) => void;
  hint?: string;
}) {
  const t = useTranslations('List');
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  // 직접 펼치거나 접은 항목만 기억한다. 손대지 않은 항목은 하위에서 고른 것이 있을 때 펼친다(찾기로 고른 뒤에도)
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const searchable = flatten(tree).length > SEARCHABLE;
  const matches = searchable ? searchTree(tree, search) : [];
  const searching = searchable && search.trim() !== '';
  const hiddenSelected = tree.slice(VISIBLE).some((n) => countSelected(n, selected) > 0);
  const roots = expanded || hiddenSelected ? tree : tree.slice(0, VISIBLE);
  const rest = tree.length - VISIBLE;

  const childSelected = (n: TermNode) => n.children.some((c) => countSelected(c, selected) > 0);
  const isOpen = (n: TermNode) => toggled[n.key] ?? childSelected(n);

  const check = (n: TermNode, extra?: ReactNode) => (
    <Text as="label" className="ct-check" color={n.depth ? 'gray' : undefined}>
      <Checkbox checked={selected.includes(n.key)} onCheckedChange={() => onToggle(n.key)} />
      <span className="ct-check-label">
        {n.label}
        {extra}
      </span>
    </Text>
  );

  const renderNode = (n: TermNode): ReactNode => {
    const opened = isOpen(n);
    const childId = `${id}-${n.key}`;
    const hiddenCount = opened ? 0 : n.children.reduce((sum, c) => sum + countSelected(c, selected), 0);
    return (
      <li key={n.key}>
        <div className="ct-facet-row">
          {check(n, hiddenCount > 0 && <span className="ct-facet-count">{t('selectedInside', { count: hiddenCount })}</span>)}
          {n.children.length > 0 && (
            <IconButton
              type="button"
              size="1"
              variant="ghost"
              color="gray"
              className="ct-facet-toggle"
              data-open={opened || undefined}
              aria-expanded={opened}
              aria-controls={childId}
              aria-label={t(opened ? 'collapseChildren' : 'expandChildren', { label: n.label })}
              onClick={() => setToggled((prev) => ({ ...prev, [n.key]: !opened }))}
            >
              <ChevronDownIcon />
            </IconButton>
          )}
        </div>
        {n.children.length > 0 && opened && (
          <ul id={childId} className="ct-facet-list ct-facet-children">
            {n.children.map(renderNode)}
          </ul>
        )}
      </li>
    );
  };

  return (
    <fieldset className="ct-fieldset">
      <legend>{legend}</legend>
      {searchable && (
        <TextField.Root
          size="1"
          type="search"
          mb="2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('facetSearch', { legend })}
          aria-label={t('facetSearch', { legend })}
          aria-controls={`${id}-list`}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon />
          </TextField.Slot>
        </TextField.Root>
      )}
      {searching ? (
        <ul id={`${id}-list`} className="ct-facet-list" aria-live="polite">
          {matches.length === 0 ? (
            <li>
              <Text size="2" color="gray">
                {t('facetNoMatch')}
              </Text>
            </li>
          ) : (
            matches.map(({ node, parent }) => (
              <li key={node.key}>{check({ ...node, depth: 0 }, parent && <span className="ct-facet-parent">{parent}</span>)}</li>
            ))
          )}
        </ul>
      ) : (
        <>
          <ul id={`${id}-list`} className="ct-facet-list">
            {roots.map(renderNode)}
          </ul>
          {rest > 0 && !hiddenSelected && (
            <RadixLink
              size="2"
              href="#"
              className="ct-facet-more"
              aria-expanded={expanded}
              onClick={(e) => {
                e.preventDefault();
                setExpanded((v) => !v);
              }}
            >
              {expanded ? t('showLess') : t('showMore', { count: rest })}
            </RadixLink>
          )}
        </>
      )}
      {hint && (
        <Text as="p" size="1" color="gray" mt="3" mb="0" style={{ textWrap: 'balance' }}>
          {hint}
        </Text>
      )}
    </fieldset>
  );
}

const ANY = '__any';
const FIRST_YEAR = 2010;

/**
 * 연·월 선택. 브라우저 기본 month 입력은 페이지 언어가 아니라 브라우저 언어로 표시되므로
 * Radix Select로 만들고 월 이름은 페이지 locale로 표시한다. 연·월이 모두 정해지면 적용한다.
 */
function MonthPicker({ label, value, onCommit }: { label: string; value?: string; onCommit: (v: string | undefined) => void }) {
  const t = useTranslations('List');
  const locale = useLocale();
  const id = useId();
  const [year, setYear] = useState(value?.slice(0, 4) ?? '');
  const [month, setMonth] = useState(value?.slice(5, 7) ?? '');
  const lastYear = new Date().getFullYear() + 1;
  const years = Array.from({ length: lastYear - FIRST_YEAR + 1 }, (_, i) => String(lastYear - i));
  const monthName = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: monthName.format(new Date(Date.UTC(2000, i, 1))),
  }));

  function update(nextYear: string, nextMonth: string) {
    setYear(nextYear);
    setMonth(nextMonth);
    if (!nextYear && !nextMonth) onCommit(undefined);
    else if (nextYear && nextMonth) onCommit(`${nextYear}-${nextMonth}`);
  }

  return (
    <Flex direction="column" gap="1" role="group" aria-labelledby={id}>
      <Text id={id} size="1" color="gray">
        {label}
      </Text>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        <Select.Root value={year || ANY} onValueChange={(v) => update(v === ANY ? '' : v, v === ANY ? '' : month)}>
          <Select.Trigger aria-label={`${label} · ${t('year')}`} placeholder={t('year')} />
          <Select.Content position="popper">
            <Select.Item value={ANY}>{t('anyYear')}</Select.Item>
            {years.map((y) => (
              <Select.Item key={y} value={y}>
                {y}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Select.Root value={month || ANY} onValueChange={(v) => update(v === ANY ? '' : year, v === ANY ? '' : v)}>
          <Select.Trigger aria-label={`${label} · ${t('month')}`} placeholder={t('month')} />
          <Select.Content position="popper">
            <Select.Item value={ANY}>{t('anyMonth')}</Select.Item>
            {months.map((m) => (
              <Select.Item key={m.value} value={m.value}>
                {m.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </div>
    </Flex>
  );
}
