'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/** 저절로 넘어가는 간격 */
const INTERVAL_MS = 6000;

/**
 * 홈 첫 화면의 대표 카드 캐러셀: 가로 스크롤 스냅 위에 이전·다음 버튼과 점 표시.
 * 마우스를 올리거나 포커스가 안에 있거나 탭이 숨겨지면 멈추고, 동작 줄이기 설정이면 저절로 넘기지 않는다
 */
export function LeadCarousel({
  slides,
  label,
  prevLabel,
  nextLabel,
  slideLabels,
}: {
  slides: ReactNode[];
  label: string;
  prevLabel: string;
  nextLabel: string;
  /** 슬라이드마다 붙는 이름(서버에서 번역해 넘긴다). 예: '3 / 5' */
  slideLabels: string[];
}) {
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = slides.length;

  const go = useCallback(
    (index: number) => {
      const el = track.current;
      if (!el) return;
      const next = (index + total) % total;
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    },
    [total],
  );

  // 손으로 넘겨도 점 표시가 따라오도록 스크롤 위치에서 현재 슬라이드를 읽는다
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setCurrent(Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)));
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (total < 2 || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      if (!document.hidden) go(current + 1);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [current, go, paused, total]);

  if (total === 0) return null;

  return (
    <section
      className="ct-carousel"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      <div ref={track} className="ct-carousel-track" aria-live={paused ? 'polite' : 'off'}>
        {slides.map((slide, i) => (
          <div
            key={i}
            className="ct-carousel-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={slideLabels[i]}
            aria-hidden={i !== current}
            inert={i !== current}
          >
            {slide}
          </div>
        ))}
      </div>

      {total > 1 && (
        <div className="ct-carousel-controls">
          <button type="button" className="ct-carousel-btn" onClick={() => go(current - 1)} aria-label={prevLabel}>
            <ChevronLeftIcon aria-hidden="true" />
          </button>
          <ol className="ct-carousel-dots">
            {slides.map((_, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="ct-carousel-dot"
                  aria-label={slideLabels[i]}
                  aria-current={i === current ? 'true' : undefined}
                  onClick={() => go(i)}
                />
              </li>
            ))}
          </ol>
          <span className="ct-carousel-count ct-mono" aria-hidden="true">
            {String(current + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
          <button type="button" className="ct-carousel-btn" onClick={() => go(current + 1)} aria-label={nextLabel}>
            <ChevronRightIcon aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
