'use client';

import { CheckIcon, Link2Icon } from '@radix-ui/react-icons';
import { Button } from '@radix-ui/themes';
import { useState } from 'react';

export function CopyLinkButton({ label, copiedLabel, fullWidth }: { label: string; copiedLabel: string; fullWidth?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="surface"
      color="gray"
      size="2"
      style={fullWidth ? { flex: 1 } : undefined}
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
