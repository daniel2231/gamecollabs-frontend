import { Flex, Text } from '@radix-ui/themes';
import { Link } from '@/i18n/navigation';
import { coverFit } from '@/lib/cover';
import type { CollabSummary } from '@/schema';
import { PeriodText } from './PeriodText';
import { PhaseBadge } from './PhaseBadge';

const MAX_TAGS = 3;

/** 콜라보 카드: 위쪽 커버(16:9, 틀 없이), 아래 기간·제목·참여 작품·분류 */
export function CollabCard({ collab }: { collab: CollabSummary }) {
  const host = collab.parties.find((p) => p.role === 'host');
  const partner = collab.parties.find((p) => p.role === 'partner');
  const tags = [...collab.regions, ...collab.platforms, ...collab.collabTypes];

  return (
    <Link href={`/collabs/${collab.slug}`} className="ct-card">
      <div className="ct-card-cover">
        {collab.cover ? (
          <img
            src={collab.cover.url}
            alt=""
            loading="lazy"
            width={collab.cover.width ?? undefined}
            height={collab.cover.height ?? undefined}
            data-fit={coverFit(collab.cover)}
          />
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

      <Flex direction="column" gap="2" style={{ flex: 1, minWidth: 0 }}>
        <Text size="1" color="gray">
          <PeriodText period={collab.period} />
        </Text>
        <Text size="4" weight="bold" className="ct-card-title">
          {collab.title}
        </Text>
        {(host || partner) && (
          <Text size="2" color="gray" className="ct-card-meta">
            {[host?.kind.label, partner?.kind.label].filter(Boolean).join(' × ')}
          </Text>
        )}
        {tags.length > 0 && (
          <p className="ct-tags">
            {tags.slice(0, MAX_TAGS).map((tag) => (
              <span key={tag.key}>{tag.label}</span>
            ))}
            {tags.length > MAX_TAGS && <span>+{tags.length - MAX_TAGS}</span>}
          </p>
        )}
      </Flex>
    </Link>
  );
}
