'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * 안에 든 '더 보기' 링크가 화면 가까이 오면 저절로 누른다(무한 스크롤).
 * 링크는 그대로 남겨 두어 JS 없이도, 크롤러도 다음 목록을 따라갈 수 있다.
 */
export function AutoLoadMore({ href, children }: { href: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // 같은 주소로 두 번 이동하지 않도록 마지막으로 누른 주소를 기억한다
  const clicked = useRef<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || clicked.current === href) return;
        clicked.current = href;
        el.querySelector('a')?.click();
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [href]);

  return <div ref={ref}>{children}</div>;
}
