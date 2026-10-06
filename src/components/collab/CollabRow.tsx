import { ImageIcon } from '@radix-ui/react-icons';
import { Badge, Flex, Text } from '@radix-ui/themes';
import { Link } from '@/i18n/navigation';
import type { CollabSummary } from '@/schema';
import { PeriodText } from './PeriodText';
import { PhaseBadge } from './PhaseBadge';
import { TranslationBadge } from './TranslationBadge';

export function CollabRow({ collab }: { collab: CollabSummary }) {
  const host = collab.parties.find((p) => p.role === 'host');
  const partner = collab.parties.find((p) => p.role === 'partner');
  const tags = [...collab.regions, ...collab.platforms, ...collab.collabTypes];
  return (
    <Link href={`/collabs/${collab.slug}`} className="ct-row">
      <div className="ct-thumb" aria-hidden="true">
        {collab.cover ? (
          <img src={collab.cover.url} alt="" width={120} height={80} loading="lazy" />
        ) : (
          <ImageIcon width="22" height="22" />
        )}
      </div>
      <Flex direction="column" gap="2" style={{ flex: '1 1 320px', minWidth: 0 }}>
        <Flex wrap="wrap" align="center" gap="2">
          <PhaseBadge phase={collab.phase} />
          <Text size="2" color="gray">
            <PeriodText period={collab.period} />
          </Text>
        </Flex>
        <Flex align="center" gap="2" wrap="wrap">
          <Text size="4" weight="bold" style={{ letterSpacing: '-0.01em' }}>
            {collab.title}
          </Text>
          {collab.fallback && <TranslationBadge kind="fallback" />}
        </Flex>
        <Flex wrap="wrap" gap="2">
          {host && (
            <Text size="2" color="gray">
              {host.kind.label} · {host.name.value}
            </Text>
          )}
          {host && partner && (
            <Text size="2" color="gray" aria-hidden="true">
              ·
            </Text>
          )}
          {partner && (
            <Text size="2" color="gray">
              {partner.kind.label} · {partner.name.value}
            </Text>
          )}
        </Flex>
      </Flex>
      {tags.length > 0 && (
        <Flex wrap="wrap" align="start" gap="2" style={{ flex: '0 1 260px', alignContent: 'flex-start' }}>
          {tags.map((tag) => (
            <Badge key={tag.key} color="gray" variant="soft" size="2">
              {tag.label}
            </Badge>
          ))}
        </Flex>
      )}
    </Link>
  );
}
