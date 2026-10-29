'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/** 넓은 화면에서 한 페이지에 들어가는 타일 수(서버에서 그릴 때 페이지 수를 어림하는 데만 쓴다. 실제 수는 CSS가 정한다) */
const WIDE_PER_PAGE = 6;

/**
 * 타일 한 줄을 옆으로 넘기는 캐러셀: 한 번에 화면 폭만큼(타일 몇 개씩) 넘어가고, 홈 대표 캐러셀과 같은 이전·다음 버튼과 막대 표시를 쓴다.
 * 한 페이지의 타일 수는 화면 폭에 따라 CSS가 정하므로 페이지 수는 그려진 폭으로 잰다. 저절로 넘기지 않는다
 */
export function TileCarousel({
  tiles,
  label,
  prevLabel,
  nextLabel,
  pageLabel,
}: {
  tiles: ReactNode[];
  label: string;
  prevLabel: string;
  nextLabel: string;
  /** 페이지 막대의 이름(서버에서 번역해 넘긴다). {index}, {total}을 채운다 */
  pageLabel: string;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(() => Math.max(1, Math.ceil(tiles.length / WIDE_PER_PAGE)));

  /** 한 페이지 폭(보이는 폭 + 타일 사이 간격) */
  const stride = useCallback(() => {
    const el = track.current!;
    return el.clientWidth + (parseFloat(getComputedStyle(el).columnGap) || 0);
  }, []);

  // 화면 폭이 바뀌면 페이지 수와 현재 페이지를 다시 잰다. 손으로 넘겨도 막대 표시가 따라온다
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      const s = stride();
      const total = Math.max(1, Math.ceil((el.scrollWidth + s - el.clientWidth) / s - 0.01));
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2;
      setPages(total);
      setPage(atEnd ? total - 1 : Math.min(total - 1, Math.round(el.scrollLeft / s)));
    };
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [stride, tiles.length]);

  const go = (index: number) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: Math.max(0, Math.min(index, pages - 1)) * stride(), behavior: reduce ? 'auto' : 'smooth' });
  };

  if (tiles.length === 0) return null;

  return (
    <section className="ct-carousel" aria-roledescription="carousel" aria-label={label}>
      <ul ref={track} className="ct-tile-track">
        {tiles.map((tile, i) => (
          <li key={i}>{tile}</li>
        ))}
      </ul>

      {pages > 1 && (
        <div className="ct-carousel-controls">
          <button type="button" className="ct-carousel-btn" onClick={() => go(page - 1)} disabled={page === 0} aria-label={prevLabel}>
            <ChevronLeftIcon aria-hidden="true" />
          </button>
          <ol className="ct-carousel-dots">
            {Array.from({ length: pages }, (_, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="ct-carousel-dot"
                  aria-label={pageLabel.replace('{index}', String(i + 1)).replace('{total}', String(pages))}
                  aria-current={i === page ? 'true' : undefined}
                  onClick={() => go(i)}
                />
              </li>
            ))}
          </ol>
          <span className="ct-carousel-count ct-mono" aria-hidden="true">
            {String(page + 1).padStart(2, '0')} / {String(pages).padStart(2, '0')}
          </span>
          <button type="button" className="ct-carousel-btn" onClick={() => go(page + 1)} disabled={page === pages - 1} aria-label={nextLabel}>
            <ChevronRightIcon aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
