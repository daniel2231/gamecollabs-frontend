'use client';

import { CheckIcon, Link2Icon } from '@radix-ui/react-icons';
import { Button } from '@radix-ui/themes';
import { useEffect, useRef, useState } from 'react';

type State = 'idle' | 'copied' | 'failed';

/** 현재 주소 복사. 결과는 버튼 자리에서 보여준다(성공은 강조색, 실패는 안내 문구) */
export function CopyLinkButton({
  label,
  copiedLabel,
  failedLabel,
  fullWidth,
  variant = 'surface',
}: {
  label: string;
  copiedLabel: string;
  failedLabel: string;
  fullWidth?: boolean;
  variant?: 'surface' | 'ghost';
}) {
  const [state, setState] = useState<State>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    let next: State = 'copied';
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      next = 'failed';
    }
    setState(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), next === 'copied' ? 1500 : 4000);
  }

  return (
    <Button
      variant={variant}
      color="gray"
      size="2"
      className="ct-copy"
      data-state={state}
      style={{ whiteSpace: 'nowrap', ...(variant === 'ghost' ? { marginInline: 0 } : undefined), ...(fullWidth ? { flex: '1 1 auto' } : undefined) }}
      onClick={copy}
    >
      {state === 'copied' ? <CheckIcon /> : <Link2Icon />}
      <span aria-live="polite">{state === 'copied' ? copiedLabel : state === 'failed' ? failedLabel : label}</span>
    </Button>
  );
}
