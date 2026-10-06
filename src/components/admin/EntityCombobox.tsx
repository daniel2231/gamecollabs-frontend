'use client';

import { Cross2Icon } from '@radix-ui/react-icons';
import { Flex, IconButton, Text, TextField } from '@radix-ui/themes';
import { useEffect, useId, useRef, useState } from 'react';
import { matchEntities } from '@/app/[locale]/admin/actions';
import type { AdminEntity, EntityKind } from '@/schema';
import { EntityFormDialog, type KindOption } from './EntityFormDialog';

export type EntityChoice = { id: string; slug: string; label: string; category: string | null };

type Option = (AdminEntity & { matchedAlias: string | null }) | { create: true };

type Props = {
  kind: EntityKind;
  label: string;
  value: EntityChoice | null;
  onChange: (value: EntityChoice | null) => void;
  kindOptions: KindOption[];
  invalid?: boolean;
};

/** 작품·회사 자동완성. 별칭 일치도 보여주고, 없으면 새로 만든다(F-05) */
export function EntityCombobox({ kind, label, value, onChange, kindOptions, invalid }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const noun = kind === 'property' ? '작품' : '회사';

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await matchEntities(q);
      if (cancelled || !res.ok) return;
      const list = kind === 'property' ? res.data.properties : res.data.companies;
      setOptions([...list, { create: true }]);
      setActive(0);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, kind]);

  function choose(option: Option | undefined) {
    if (!option) return;
    if ('create' in option) {
      setCreating(true);
      setOpen(false);
      return;
    }
    onChange({ id: option.id, slug: option.slug, label: option.name.ko, category: option.category });
    setQuery('');
    setOpen(false);
  }

  if (value) {
    return (
      <div className="ct-field">
        <span className="ct-label">{label}</span>
        <Flex align="center" justify="between" gap="2" px="3" style={{ minHeight: 36, border: '1px solid var(--gray-a7)', borderRadius: 'var(--radius-2)' }}>
          <Text size="2">
            <Text weight="medium">{value.label}</Text>{' '}
            <Text color="gray" className="ct-mono" size="1">
              {value.slug}
            </Text>
          </Text>
          <IconButton size="1" variant="ghost" color="gray" aria-label={`${label} 선택 해제`} onClick={() => { onChange(null); setTimeout(() => inputRef.current?.focus()); }}>
            <Cross2Icon />
          </IconButton>
        </Flex>
      </div>
    );
  }

  const expanded = open && options.length > 0;
  return (
    <div className="ct-field" style={{ position: 'relative' }}>
      <label htmlFor={id} className="ct-label">
        {label}
      </label>
      <TextField.Root
        id={id}
        ref={inputRef}
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        aria-activedescendant={expanded ? `${listId}-${active}` : undefined}
        placeholder={`${noun} 이름·별칭으로 검색`}
        value={query}
        color={invalid ? 'red' : undefined}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && expanded) {
            e.preventDefault();
            choose(options[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {expanded && (
        <ul id={listId} role="listbox" aria-label={`${noun} 후보`} className="ct-combobox-list" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20 }}>
          {options.map((o, i) => (
            <li
              key={'create' in o ? 'create' : o.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(o)}
            >
              {'create' in o ? (
                <Text size="2" color="indigo">
                  + “{query.trim()}”로 새 {noun} 만들기
                </Text>
              ) : (
                <>
                  <Text size="2" weight="bold">
                    {o.name.ko}
                    {o.name.en && o.name.en !== o.name.ko && (
                      <Text weight="regular" color="gray">
                        {' '}
                        · {o.name.en}
                      </Text>
                    )}
                  </Text>
                  <Text size="1" color="gray">
                    <span className="ct-mono">{o.slug}</span>
                    {o.matchedAlias && ` · 별칭 “${o.matchedAlias}” 일치`}
                    {` · 콜라보 ${o.collabCount}`}
                  </Text>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <EntityFormDialog
        kind={kind}
        open={creating}
        onOpenChange={setCreating}
        seedName={query.trim()}
        kindOptions={kindOptions}
        onSaved={(e) => {
          onChange({ id: e.id, slug: e.slug, label: e.name.ko, category: e.category });
          setQuery('');
        }}
      />
    </div>
  );
}
