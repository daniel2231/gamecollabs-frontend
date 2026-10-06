'use client';

import { Button, Flex, Heading, Text } from '@radix-ui/themes';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { CollabSummary } from '@/schema';
import { Timeline } from './Timeline';

type Item = CollabSummary & { heading: string; extra?: string };

/** 정렬은 클라이언트에서 바꿔 페이지를 ISR로 캐시할 수 있게 한다 */
export function EntityTimeline({ items }: { items: Item[] }) {
  const t = useTranslations('Property');
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  return (
    <section aria-labelledby="h-timeline" className="ct-main">
      <Flex wrap="wrap" align="center" justify="between" gap="3" mb="3">
        <Heading as="h2" id="h-timeline" size="6">
          {t('timeline')}
        </Heading>
        <Flex role="group" aria-label={t('timeline')} gap="1" p="1" style={{ background: 'var(--gray-a3)', borderRadius: 'var(--radius-2)' }}>
          {(['desc', 'asc'] as const).map((o) => (
            <Button key={o} size="1" variant={order === o ? 'surface' : 'ghost'} color="gray" highContrast={order === o} style={{ margin: 0 }} aria-pressed={order === o} onClick={() => setOrder(o)}>
              {o === 'desc' ? t('sortNewest') : t('sortOldest')}
            </Button>
          ))}
        </Flex>
      </Flex>
      {items.length === 0 ? <Text color="gray">{t('empty')}</Text> : <Timeline items={items} order={order} />}
    </section>
  );
}
