'use client';

import { CheckIcon, ChevronDownIcon, GlobeIcon } from '@radix-ui/react-icons';
import { Button, DropdownMenu, Flex, Text } from '@radix-ui/themes';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

/** 언어 전환: 같은 경로·쿼리를 유지하고 /ko ↔ /en만 바꾼다 */
export function LanguageMenu() {
  const t = useTranslations('Site.language');
  const locale = useLocale();
  const pathname = usePathname();
  const params = useSearchParams();
  const qs = params.toString();
  const href = qs ? `${pathname}?${qs}` : pathname;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button variant="surface" color="gray" size="3" aria-label={t('label')}>
          <GlobeIcon />
          {locale.toUpperCase()}
          <ChevronDownIcon />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" style={{ minWidth: 180 }}>
        {routing.locales.map((l) => (
          <DropdownMenu.Item key={l} asChild>
            <Link href={href} locale={l} lang={l} hrefLang={l} aria-current={l === locale ? 'true' : undefined}>
              <Flex justify="between" align="center" width="100%" gap="3">
                <Flex direction="column">
                  <Text>{t(l)}</Text>
                  <Text size="1" color="gray" className="ct-mono">
                    /{l}
                  </Text>
                </Flex>
                {l === locale && <CheckIcon />}
              </Flex>
            </Link>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
