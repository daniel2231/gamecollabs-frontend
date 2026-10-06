'use client';

import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Kbd, TextField, VisuallyHidden } from '@radix-ui/themes';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';

/** 헤더 검색. 목록 화면에서는 현재 필터를 유지한 채 q만 바꾼다. '/' 키로 포커스 */
export function SearchBox() {
  const t = useTranslations('Site.search');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = pathname === '/' ? (params.get('q') ?? '') : '';
  const [value, setValue] = useState(current);
  const inputRef = useRef<HTMLInputElement>(null);

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
    const next = new URLSearchParams(pathname === '/' ? params.toString() : '');
    const q = value.trim();
    if (q) next.set('q', q);
    else next.delete('q');
    next.delete('limit');
    const qs = next.toString();
    router.push(qs ? `/?${qs}` : '/');
  }

  return (
    <form role="search" onSubmit={onSubmit} style={{ flex: '1 1 260px', minWidth: 0 }}>
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
        onChange={(e) => setValue(e.target.value)}
        maxLength={100}
        enterKeyHint="search"
      >
        <TextField.Slot>
          <MagnifyingGlassIcon height="16" width="16" />
        </TextField.Slot>
        <TextField.Slot>
          <Kbd size="1">/</Kbd>
        </TextField.Slot>
      </TextField.Root>
    </form>
  );
}
