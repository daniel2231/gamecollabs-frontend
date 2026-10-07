'use client';

import { ChevronDownIcon, GlobeIcon } from '@radix-ui/react-icons';
import { Button, DropdownMenu } from '@radix-ui/themes';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { isLocale, routing } from '@/i18n/routing';

/** 언어 전환: 같은 경로·쿼리를 유지하고 /ko ↔ /en만 바꾼다 */
export function LanguageMenu() {
  const t = useTranslations('Site.language');
  const locale = useLocale();
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: string) {
    if (!isLocale(next) || next === locale) return;
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { locale: next, scroll: false }));
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button variant="surface" color="gray" size="3" aria-label={t('label')} loading={pending}>
          <GlobeIcon />
          {locale.toUpperCase()}
          <ChevronDownIcon />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" variant="soft" style={{ minWidth: 160 }}>
        <DropdownMenu.RadioGroup value={locale} onValueChange={change}>
          {routing.locales.map((l) => (
            <DropdownMenu.RadioItem key={l} value={l} lang={l}>
              {t(l)}
            </DropdownMenu.RadioItem>
          ))}
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
