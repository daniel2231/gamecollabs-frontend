'use client';

import { MixerHorizontalIcon } from '@radix-ui/react-icons';
import { Button, Checkbox, Flex, Link as RadixLink, Text } from '@radix-ui/themes';
import { useTranslations } from 'next-intl';
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <MonthInput label={t('from')} value={query.from} onCommit={(from) => navigate({ ...query, from, limit: 20 })} />
            <MonthInput label={t('to')} value={query.to} onCommit={(to) => navigate({ ...query, to, limit: 20 })} />
          </div>
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

function MonthInput({ label, value, onCommit }: { label: string; value?: string; onCommit: (v: string | undefined) => void }) {
  const id = useId();
  return (
    <Flex direction="column" gap="1">
      <Text as="label" htmlFor={id} size="1" color="gray">
        {label}
      </Text>
      <input
        id={id}
        className="ct-month"
        type="month"
        defaultValue={value ?? ''}
        key={value ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '' || /^\d{4}-\d{2}$/.test(v)) onCommit(v || undefined);
        }}
      />
    </Flex>
  );
}
