'use client';

import { BookmarkFilledIcon, BookmarkIcon } from '@radix-ui/react-icons';
import { Button, Text } from '@radix-ui/themes';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { loginHref } from './loginHref';

/** loading: 상태 확인 중, out: 로그아웃(누르면 로그인), off/on: 저장 여부 */
type State = 'loading' | 'out' | 'off' | 'on';

/**
 * 콜라보 저장 버튼. 상세 페이지는 정적이라 저장 여부는 브라우저에서 /api/me/bookmarks/<slug>로 받는다.
 * 누르면 바로 바뀌고(낙관적 갱신) 실패하면 되돌린다.
 */
export function BookmarkButton({ slug }: { slug: string }) {
  const t = useTranslations('Member');
  const [state, setState] = useState<State>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = `/api/me/bookmarks/${encodeURIComponent(slug)}`;

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(url, { signal: ctrl.signal, cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 401) return setState('out');
        if (!r.ok) return setState('off');
        setState(((await r.json()) as { bookmarked: boolean }).bookmarked ? 'on' : 'off');
      })
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [url]);

  async function toggle() {
    if (state === 'out') {
      window.location.href = loginHref();
      return;
    }
    if (state === 'loading' || busy) return;
    const previous = state;
    const next = state === 'on' ? 'off' : 'on';
    setState(next);
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(url, { method: next === 'on' ? 'PUT' : 'DELETE' });
      if (r.status === 401) {
        setState('out');
        window.location.href = loginHref();
        return;
      }
      if (!r.ok) {
        setState(previous);
        setError(r.status === 409 ? t('saveLimit') : t('saveFailed'));
        return;
      }
      setState(((await r.json()) as { bookmarked: boolean }).bookmarked ? 'on' : 'off');
    } catch {
      setState(previous);
      setError(t('saveFailed'));
    } finally {
      setBusy(false);
    }
  }

  const on = state === 'on';
  return (
    <>
      <Button
        variant={on ? 'soft' : 'surface'}
        color="gray"
        size="2"
        highContrast={on}
        aria-pressed={state === 'on' || state === 'off' ? on : undefined}
        title={state === 'out' ? t('saveHint') : undefined}
        disabled={state === 'loading'}
        onClick={toggle}
        style={{ whiteSpace: 'nowrap' }}
      >
        {on ? <BookmarkFilledIcon /> : <BookmarkIcon />}
        {on ? t('saved') : t('save')}
      </Button>
      {error && (
        <Text size="1" color="red" role="status" style={{ alignSelf: 'center' }}>
          {error}
        </Text>
      )}
    </>
  );
}
