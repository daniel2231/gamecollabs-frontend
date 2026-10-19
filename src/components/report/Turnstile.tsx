'use client';

import { useEffect, useRef } from 'react';

type TurnstileApi = {
  render(el: HTMLElement, opts: { sitekey: string; language?: string; theme?: 'light' | 'dark' | 'auto' }): string;
  remove(id: string): void;
};

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** 스크립트는 한 번만 넣고, 여러 폼이 같은 로드를 기다린다 */
let loading: Promise<TurnstileApi> | null = null;
function loadTurnstile(): Promise<TurnstileApi> {
  const w = window as { turnstile?: TurnstileApi };
  if (w.turnstile) return Promise.resolve(w.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => (w.turnstile ? resolve(w.turnstile) : reject(new Error('turnstile missing')));
    s.onerror = () => {
      loading = null;
      reject(new Error('turnstile failed to load'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/**
 * Cloudflare Turnstile 위젯. 폼 안에 두면 위젯이 `cf-turnstile-response` 숨은 칸을 넣고,
 * 서버 액션이 그 값을 백엔드(TURNSTILE_SECRET)로 넘긴다. 사이트 키가 없으면 렌더링하지 않는다.
 */
export function Turnstile({ siteKey, locale }: { siteKey: string; locale: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let id: string | undefined;
    let cancelled = false;
    loadTurnstile()
      .then((t) => {
        if (!cancelled && ref.current) id = t.render(ref.current, { sitekey: siteKey, language: locale, theme: 'dark' });
      })
      .catch((e) => console.error(e));
    return () => {
      cancelled = true;
      if (id) (window as { turnstile?: TurnstileApi }).turnstile?.remove(id);
    };
  }, [siteKey, locale]);
  return <div ref={ref} style={{ minHeight: 65 }} />;
}
