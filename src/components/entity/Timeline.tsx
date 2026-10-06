import { Badge, Flex, Text } from '@radix-ui/themes';
import { useTranslations } from 'next-intl';
import { PeriodText } from '@/components/collab/PeriodText';
import { PhaseBadge } from '@/components/collab/PhaseBadge';
import { Link } from '@/i18n/navigation';
import type { CollabSummary } from '@/schema';

type Item = CollabSummary & { heading: string; extra?: string };

/** 연도별로 묶은 콜라보 타임라인. 시기 미상은 맨 뒤 */
export function Timeline({ items, order }: { items: Item[]; order: 'desc' | 'asc' }) {
  const t = useTranslations('Property');
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    const year = item.period.start && item.period.precision !== 'unknown' ? item.period.start.slice(0, 4) : '';
    groups.set(year, [...(groups.get(year) ?? []), item]);
  }
  const years = [...groups.keys()]
    .filter(Boolean)
    .sort((a, b) => (order === 'desc' ? b.localeCompare(a) : a.localeCompare(b)));
  if (groups.has('')) years.push('');

  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {years.map((year) => {
        const list = order === 'asc' ? [...groups.get(year)!].reverse() : groups.get(year)!;
        return (
          <li key={year || 'unknown'}>
            <Flex align="center" gap="3" pt="3" pb="2">
              <Text size="2" weight="medium" color="gray" className="ct-mono">
                {year || t('unknownYear')}
              </Text>
              <span style={{ flex: 1, height: 1, background: 'var(--ct-line)' }} />
            </Flex>
            <ol className="ct-timeline">
              {list.map((item) => (
                <li key={item.slug}>
                  <span className="ct-timeline-dot" data-muted={item.phase === 'ended' || item.phase === 'unknown' ? '' : undefined} aria-hidden="true" />
                  <Link href={`/collabs/${item.slug}`} className="ct-card-link" style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px 20px', padding: '14px 16px' }}>
                    <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
                      <Text size="3" weight="bold">
                        {item.heading}
                      </Text>
                      <Text size="2" color="gray">
                        {[...item.collabTypes, ...item.platforms, ...item.regions].map((x) => x.label).join(' · ') || item.title}
                      </Text>
                    </Flex>
                    <Flex align="center" gap="2" wrap="wrap">
                      {item.extra && (
                        <Badge variant="soft" size="1">
                          {item.extra}
                        </Badge>
                      )}
                      <Text size="2" color="gray">
                        <PeriodText period={item.period} />
                      </Text>
                      <PhaseBadge phase={item.phase} />
                    </Flex>
                  </Link>
                </li>
              ))}
            </ol>
          </li>
        );
      })}
    </ol>
  );
}
