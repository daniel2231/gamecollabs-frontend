import { Card, Flex, Heading, Text } from '@radix-ui/themes';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export function StatGrid({ stats }: { stats: { label: string; value: string }[] }) {
  return (
    <div className="ct-stat-grid" style={{ flex: '0 1 520px' }}>
      {stats.map((s) => (
        <div key={s.label}>
          <Text as="div" size="1" color="gray">
            {s.label}
          </Text>
          <Text as="div" size="7" weight="medium" className="ct-mono">
            {s.value}
          </Text>
        </div>
      ))}
    </div>
  );
}

export function CountList({ title, items, hrefPrefix }: { title: string; items: { slug: string; name: string; count: number }[]; hrefPrefix: string }) {
  const t = useTranslations('Property');
  return (
    <Card size="2">
      <Heading as="h2" size="3" mb="3">
        {title}
      </Heading>
      {items.length === 0 ? (
        <Text size="2" color="gray">
          {t('noData')}
        </Text>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map((it, i) => (
            <li key={it.slug} style={i ? { borderTop: '1px solid var(--ct-line-soft)' } : undefined}>
              <Link href={`${hrefPrefix}/${it.slug}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: 'var(--gray-12)', textDecoration: 'none' }}>
                <span>{it.name}</span>
                <Text size="2" color="gray" className="ct-mono">
                  {it.count}
                </Text>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function Distribution({ title, items }: { title: string; items: { key: string; label: string; count: number }[] }) {
  const t = useTranslations('Property');
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <Card size="2">
      <Heading as="h2" size="3" mb="3">
        {title}
      </Heading>
      {items.length === 0 ? (
        <Text size="2" color="gray">
          {t('noData')}
        </Text>
      ) : (
        <Flex direction="column" gap="3">
          {items.map((it) => (
            <Flex key={it.key} direction="column" gap="1">
              <Flex justify="between">
                <Text size="2">{it.label}</Text>
                <Text size="2" color="gray" className="ct-mono">
                  {it.count}
                </Text>
              </Flex>
              <div className="ct-bar" role="presentation">
                <span style={{ width: `${(it.count / max) * 100}%` }} />
              </div>
            </Flex>
          ))}
        </Flex>
      )}
    </Card>
  );
}
