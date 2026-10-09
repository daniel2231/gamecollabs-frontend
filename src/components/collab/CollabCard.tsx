import { Badge, Flex, Text } from '@radix-ui/themes';
import { Link } from '@/i18n/navigation';
import type { CollabSummary } from '@/schema';
import { PeriodText } from './PeriodText';
import { PhaseBadge } from './PhaseBadge';

const MAX_TAGS = 3;
// 커버가 없을 때 slug로 고르는 색. Radix 팔레트 안에서만 고른다
const TINTS = ['indigo', 'cyan', 'crimson', 'amber', 'grass', 'violet', 'orange', 'teal'] as const;

function tintFor(slug: string): (typeof TINTS)[number] {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length]!;
}

/** 콜라보 카드: 위쪽 커버(16:9), 아래 진행 상태·기간·제목·참여 작품·분류 */
export function CollabCard({ collab }: { collab: CollabSummary }) {
  const host = collab.parties.find((p) => p.role === 'host');
  const partner = collab.parties.find((p) => p.role === 'partner');
  const tags = [...collab.regions, ...collab.platforms, ...collab.collabTypes];
  const tint = tintFor(collab.slug);

  return (
    <Link href={`/collabs/${collab.slug}`} className="ct-card">
      <div className="ct-card-cover" data-tint={collab.cover ? undefined : tint} style={collab.cover ? undefined : ({ '--tint-bg': `var(--${tint}-a3)`, '--tint-fg': `var(--${tint}-11)` } as React.CSSProperties)}>
        {collab.cover ? (
          <img src={collab.cover.url} alt="" loading="lazy" width={collab.cover.width ?? undefined} height={collab.cover.height ?? undefined} />
        ) : (
          <div className="ct-card-mono" aria-hidden="true">
            <span>{host?.name.value.charAt(0) ?? '?'}</span>
            <span className="ct-card-x">×</span>
            <span>{partner?.name.value.charAt(0) ?? '?'}</span>
          </div>
        )}
        <span className="ct-card-phase">
          <PhaseBadge phase={collab.phase} />
        </span>
      </div>

      <Flex direction="column" gap="2" p="4" style={{ flex: 1, minWidth: 0 }}>
        <Text size="1" color="gray">
          <PeriodText period={collab.period} />
        </Text>
        <Flex align="start" gap="2">
          <Text size="4" weight="bold" className="ct-card-title">
            {collab.title}
          </Text>
        </Flex>
        {(host || partner) && (
          <Text size="2" color="gray" className="ct-card-meta">
            {[host?.kind.label, partner?.kind.label].filter(Boolean).join(' × ')}
          </Text>
        )}
        {tags.length > 0 && (
          <Flex wrap="wrap" gap="1" mt="auto" pt="2">
            {tags.slice(0, MAX_TAGS).map((tag) => (
              <Badge key={tag.key} color="gray" variant="soft">
                {tag.label}
              </Badge>
            ))}
            {tags.length > MAX_TAGS && (
              <Badge color="gray" variant="outline">
                +{tags.length - MAX_TAGS}
              </Badge>
            )}
          </Flex>
        )}
      </Flex>
    </Link>
  );
}
