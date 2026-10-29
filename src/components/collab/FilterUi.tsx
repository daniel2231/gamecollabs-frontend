'use client';

import { MixerHorizontalIcon } from '@radix-ui/react-icons';
import { Button } from '@radix-ui/themes';
import { useTranslations } from 'next-intl';
import { createContext, use, useId, useState, type ReactNode } from 'react';

type FilterUi = { open: boolean; setOpen: (open: boolean) => void; bodyId: string };

const FilterUiContext = createContext<FilterUi | null>(null);

/**
 * 좁은 화면에서 필터 패널을 여닫는 상태. 여는 버튼은 결과 줄(개수·정렬과 같은 줄)에 있고
 * 패널은 그 위의 사이드에 있어서, 둘이 같은 상태를 나눠 쓴다
 */
export function FilterUiProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  return <FilterUiContext value={{ open, setOpen, bodyId }}>{children}</FilterUiContext>;
}

export function useFilterUi(): FilterUi {
  const ui = use(FilterUiContext);
  if (!ui) throw new Error('FilterUiProvider가 필요합니다');
  return ui;
}

/** 좁은 화면 전용 필터 버튼. 걸린 필터 수를 함께 보여준다 */
export function FilterToggle({ count }: { count: number }) {
  const t = useTranslations('List');
  const { open, setOpen, bodyId } = useFilterUi();
  return (
    <Button
      className="ct-filter-toggle"
      size="2"
      variant={count > 0 ? 'solid' : 'soft'}
      color="gray"
      highContrast={count > 0}
      aria-expanded={open}
      aria-controls={bodyId}
      onClick={() => setOpen(!open)}
    >
      <MixerHorizontalIcon />
      {t('filters')}
      {count > 0 && <span className="ct-mono">{count}</span>}
    </Button>
  );
}
