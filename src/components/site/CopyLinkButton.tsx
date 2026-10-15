'use client';

import { CheckIcon, Link2Icon } from '@radix-ui/react-icons';
import { Button } from '@radix-ui/themes';
import { useState } from 'react';

export function CopyLinkButton({
  label,
  copiedLabel,
  fullWidth,
  variant = 'surface',
}: {
  label: string;
  copiedLabel: string;
  fullWidth?: boolean;
  variant?: 'surface' | 'ghost';
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant={variant}
      color="gray"
      size="2"
      style={{ whiteSpace: 'nowrap', ...(variant === 'ghost' ? { marginInline: 0 } : undefined), ...(fullWidth ? { flex: '1 1 auto' } : undefined) }}
      onClick={async () => {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <CheckIcon /> : <Link2Icon />}
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </Button>
  );
}
