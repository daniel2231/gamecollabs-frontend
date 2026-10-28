'use client';

import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Kbd, Spinner, TextField, VisuallyHidden } from '@radix-ui/themes';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useTransition, type FormEvent, type RefObject } from 'react';
import { PendingMark } from './Pending';
import { usePathname, useRouter } from '@/i18n/navigation';
import { LIST_PATH } from '@/lib/list-url';

/** 헤더 검색. 결과는 목록(/collabs)에 보여준다. 목록 화면에서는 현재 필터를 유지한 채 q만 바꾼다. '/' 키로 포커스 */
export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = pathname === LIST_PATH ? (params.get('q') ?? '') : '';
  const [value, setValue] = useState(current);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => setValue(current), [current]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(pathname === LIST_PATH ? params.toString() : '');
    const q = value.trim();
    if (q) next.set('q', q);
    else next.delete('q');
    next.delete('limit');
    const qs = next.toString();
    startTransition(() => router.push(qs ? `${LIST_PATH}?${qs}` : LIST_PATH));
  }

  return (
    <SearchField
      inputRef={inputRef}
      value={value}
      pending={pending}
      onChange={setValue}
      onSubmit={onSubmit}
    />
  );
}

/**
 * 하이드레이션 전에 보이는 같은 모양의 검색 상자. SearchBox는 useSearchParams 때문에 정적 페이지에서
 * 브라우저에서만 그려지므로, 자리를 비워 두면 JS가 늦게 올 때 아래 내용이 밀린다(CLS)
 */
export function SearchBoxFallback() {
  return <SearchField />;
}

function SearchField({
  inputRef,
  value,
  pending = false,
  onChange,
  onSubmit,
}: {
  inputRef?: RefObject<HTMLInputElement | null>;
  value?: string;
  pending?: boolean;
  onChange?: (value: string) => void;
  onSubmit?: (e: FormEvent) => void;
}) {
  const t = useTranslations('Site.search');
  return (
    <form role="search" onSubmit={onSubmit} style={{ flex: '1 1 260px', minWidth: 0 }}>
      <PendingMark pending={pending} />
      <VisuallyHidden>
        <label htmlFor="site-search">{t('label')}</label>
      </VisuallyHidden>
      <TextField.Root
        id="site-search"
        ref={inputRef}
        type="search"
        size="3"
        placeholder={t('placeholder')}
        value={value}
        readOnly={!onChange}
        onChange={onChange && ((e) => onChange(e.target.value))}
        maxLength={100}
        enterKeyHint="search"
      >
        <TextField.Slot>
          <MagnifyingGlassIcon height="16" width="16" />
        </TextField.Slot>
        <TextField.Slot>{pending ? <Spinner size="2" /> : <Kbd size="1">/</Kbd>}</TextField.Slot>
      </TextField.Root>
    </form>
  );
}
