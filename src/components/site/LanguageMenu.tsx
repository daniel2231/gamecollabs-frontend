'use client';

import { ChevronDownIcon } from '@radix-ui/react-icons';
import { Button, DropdownMenu } from '@radix-ui/themes';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition, type ComponentProps } from 'react';
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
        <LanguageButton label={t('label')} locale={locale} pending={pending} />
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

/** 하이드레이션 전에 보이는 같은 크기의 버튼. 자리를 비워 두면 JS가 늦게 올 때 헤더 링크가 옆으로 밀린다(CLS) */
export function LanguageMenuFallback() {
  const t = useTranslations('Site.language');
  return <LanguageButton label={t('label')} locale={useLocale()} />;
}

function LanguageButton({ label, locale, pending = false, ...props }: { label: string; locale: string; pending?: boolean } & ComponentProps<typeof Button>) {
  return (
    // 접근 가능한 이름에 보이는 글자(KO)를 포함해야 음성 명령으로도 누를 수 있다
    <Button {...props} variant="ghost" color="gray" size="2" aria-label={`${label}: ${locale.toUpperCase()}`} loading={pending} className="ct-mono" style={{ marginInline: 0 }}>
      {locale.toUpperCase()}
      <ChevronDownIcon />
    </Button>
  );
}
