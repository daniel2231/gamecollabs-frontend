'use client';

import { MixerHorizontalIcon } from '@radix-ui/react-icons';
import { Button, Checkbox, Flex, Link as RadixLink, Select, Text } from '@radix-ui/themes';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { serializeCollabQuery, toggleFacet } from '@/lib/filters';
import { flatten, type TermNode } from '@/lib/taxonomy';
import type { CollabQuery, FacetParam } from '@/schema';

const VISIBLE = 5;

type Props = {
  query: CollabQuery;
  facets: { param: FacetParam; tree: TermNode[] }[];
};

export function FilterPanel({ query, facets }: Props) {
  const t = useTranslations('List');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  function navigate(next: CollabQuery) {
    startTransition(() => router.replace(`/${serializeCollabQuery(next)}`, { scroll: false }));
  }

  return (
    <aside aria-label={t('filters')} className="ct-side ct-filter" aria-busy={pending} style={{ flexBasis: 248 }}>
      <Flex align="center" justify="between" pb="2">
        <Text weight="bold">{t('filters')}</Text>
        <Flex gap="3" align="center">
          <RadixLink
            size="2"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate({ ...query, category: [], partner_category: [], region: [], platform: [], collab_type: [], from: undefined, to: undefined, limit: 20 });
            }}
          >
            {t('reset')}
          </RadixLink>
          <Button
            className="ct-filter-toggle"
            size="1"
            variant="soft"
            color="gray"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen((v) => !v)}
          >
            <MixerHorizontalIcon />
            {t('openFilters')}
          </Button>
        </Flex>
      </Flex>

      <div id={bodyId} className="ct-filter-body" data-open={open}>
        {facets.map(({ param, tree }) =>
          tree.length === 0 ? null : (
            <FacetGroup
              key={param}
              legend={t(`facet.${param}`)}
              tree={tree}
              selected={query[param]}
              onToggle={(key) => navigate(toggleFacet(query, param, key))}
              hint={param === 'platform' || param === 'region' ? t('hierarchyHint') : undefined}
            />
          ),
        )}

        <fieldset className="ct-fieldset">
          <legend>{t('period')}</legend>
          <Flex direction="column" gap="3">
            <MonthPicker key={`from-${query.from ?? ""}`} label={t("from")} value={query.from} onCommit={(from) => navigate({ ...query, from, limit: 20 })} />
            <MonthPicker key={`to-${query.to ?? ""}`} label={t("to")} value={query.to} onCommit={(to) => navigate({ ...query, to, limit: 20 })} />
          </Flex>
        </fieldset>
      </div>
    </aside>
  );
}

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
  const [expanded, setExpanded] = useState(false);
  const hiddenSelected = tree.slice(VISIBLE).some((n) => flatten([n]).some((x) => selected.includes(x.key)));
  const roots = expanded || hiddenSelected ? tree : tree.slice(0, VISIBLE);
  const rest = tree.length - VISIBLE;
  const nodes = flatten(roots);
  return (
    <fieldset className="ct-fieldset">
      <legend>{legend}</legend>
      <Flex direction="column" gap="2">
        {nodes.map((n) => (
          <Text as="label" key={n.key} className="ct-check" style={{ paddingLeft: n.depth * 26 }} color={n.depth ? 'gray' : undefined}>
            <Checkbox checked={selected.includes(n.key)} onCheckedChange={() => onToggle(n.key)} />
            {n.label}
          </Text>
        ))}
        {rest > 0 && !hiddenSelected && (
          <RadixLink
            size="2"
            href="#"
            style={{ paddingLeft: 26 }}
            aria-expanded={expanded}
            onClick={(e) => {
              e.preventDefault();
              setExpanded((v) => !v);
            }}
          >
            {expanded ? t('showLess') : t('showMore', { count: rest })}
          </RadixLink>
        )}
      </Flex>
      {hint && (
        <Text as="p" size="1" color="gray" mt="3" mb="0">
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
