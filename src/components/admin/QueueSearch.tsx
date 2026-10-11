'use client';

import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Spinner, TextField } from '@radix-ui/themes';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition, type FormEvent } from 'react';
import { PendingMark } from '@/components/site/Pending';
import { useRouter } from '@/i18n/navigation';

/** 검수 큐 검색: 지금 보고 있는 상태(발행됨 등) 안에서 제목·작품·회사 이름으로 찾는다. 다른 필터는 유지한다 */
export function QueueSearch({ q, scopeLabel }: { q: string; scopeLabel: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(q);
  const [pending, startTransition] = useTransition();

  useEffect(() => setValue(q), [q]);

  function go(next: string) {
    const p = new URLSearchParams(params.toString());
    if (next) p.set('q', next);
    else p.delete('q');
    // 검색 결과의 첫 항목을 보여주도록 선택은 푼다
    p.delete('id');
    const s = p.toString();
    startTransition(() => router.replace(s ? `/admin?${s}` : '/admin', { scroll: false }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = value.trim();
    if (next !== q) go(next);
  }

  return (
    <form role="search" onSubmit={onSubmit}>
      <PendingMark pending={pending} scope="list" />
      <TextField.Root
        type="search"
        size="2"
        aria-label={`${scopeLabel}에서 검색`}
        placeholder={`${scopeLabel}에서 제목·작품·회사 검색`}
        value={value}
        maxLength={100}
        enterKeyHint="search"
        onChange={(e) => {
          setValue(e.target.value);
          // 입력란의 지우기(×)로 비우면 바로 전체 목록으로 돌아간다
          if (!e.target.value && q) go('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            setValue('');
            if (q) go('');
          }
        }}
      >
        <TextField.Slot>{pending ? <Spinner /> : <MagnifyingGlassIcon />}</TextField.Slot>
      </TextField.Root>
    </form>
  );
}
