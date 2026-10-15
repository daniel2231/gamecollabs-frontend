'use client';

import { Select } from '@radix-ui/themes';
import { useTranslations } from 'next-intl';
import { useOptimistic, useTransition } from 'react';
import { PendingMark } from '@/components/site/Pending';
import { useRouter } from '@/i18n/navigation';
import { listHref } from '@/lib/filters';
import { SORTS, type CollabQuery, type Sort } from '@/schema';

export function SortSelect({ query }: { query: CollabQuery }) {
  const t = useTranslations('List.sort');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sort, setSort] = useOptimistic(query.sort);
  return (
    <>
      <PendingMark pending={pending} />
      <Select.Root
        value={sort}
        size="2"
        onValueChange={(next) =>
          startTransition(() => {
            setSort(next as Sort);
            router.replace(listHref({ ...query, sort: next as Sort, limit: 20 }), { scroll: false });
          })
        }
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
    </>
  );
}
