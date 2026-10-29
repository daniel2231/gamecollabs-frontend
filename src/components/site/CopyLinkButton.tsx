'use client';

import { CheckIcon, Link2Icon } from '@radix-ui/react-icons';
import { Button } from '@radix-ui/themes';
import { useEffect, useRef, useState } from 'react';

type State = 'idle' | 'copied' | 'failed';

/**
 * 현재 주소 복사. 결과는 버튼 자리에서 보여준다(성공은 강조색, 실패는 안내 문구).
 * compact면 좁은 화면에서 평소엔 아이콘만 보인다(글자는 스크린리더용으로 남고, 결과 문구는 그대로 보인다)
 */
export function CopyLinkButton({
  label,
  copiedLabel,
  failedLabel,
  fullWidth,
  variant = 'surface',
  compact = false,
}: {
  label: string;
  copiedLabel: string;
  failedLabel: string;
  fullWidth?: boolean;
  variant?: 'surface' | 'ghost';
  compact?: boolean;
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
      className={compact ? 'ct-copy ct-copy-compact' : 'ct-copy'}
      data-state={state}
      style={{ whiteSpace: 'nowrap', ...(variant === 'ghost' ? { marginInline: 0 } : undefined), ...(fullWidth ? { flex: '1 1 auto' } : undefined) }}
      onClick={copy}
    >
      {state === 'copied' ? <CheckIcon /> : <Link2Icon />}
      <span aria-live="polite" className="ct-copy-label">
        {state === 'copied' ? copiedLabel : state === 'failed' ? failedLabel : label}
      </span>
    </Button>
  );
}
