'use client';

import { useState, type ReactNode } from 'react';

/**
 * 앞의 visible개만 보이고 나머지는 '더 보기'로 펼치는 목록. 항목은 서버에서 그린 <li>를 받는다.
 * 펼쳐도 같은 목록 안에 이어서 보이므로 순서·구분선이 그대로다
 */
export function MoreList({ items, visible, className, moreLabel, lessLabel }: { items: ReactNode[]; visible: number; className: string; moreLabel: string; lessLabel: string }) {
  const [expanded, setExpanded] = useState(false);
  const hidden = items.length > visible;
  return (
    <>
      <ul className={className}>{expanded || !hidden ? items : items.slice(0, visible)}</ul>
      {hidden && (
        <button type="button" className="ct-more ct-list-more" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
          {expanded ? lessLabel : moreLabel}
        </button>
      )}
    </>
  );
}
