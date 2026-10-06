'use client';

import { Select } from '@radix-ui/themes';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { serializeCollabQuery } from '@/lib/filters';
import { SORTS, type CollabQuery, type Sort } from '@/schema';

export function SortSelect({ query }: { query: CollabQuery }) {
  const t = useTranslations('List.sort');
  const router = useRouter();
  return (
    <Select.Root
      value={query.sort}
      size="2"
      onValueChange={(sort) => router.replace(`/${serializeCollabQuery({ ...query, sort: sort as Sort, limit: 20 })}`, { scroll: false })}
    >
      <Select.Trigger aria-label={t('label')} variant="surface" />
      <Select.Content position="popper">
        {SORTS.map((s) => (
          <Select.Item key={s} value={s}>
            {t(s)}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}
