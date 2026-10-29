import { PhaseBadge } from '@/components/collab/PhaseBadge';
import { CoverImage } from '@/components/site/CoverImage';
import { Link } from '@/i18n/navigation';
import { coverTone } from '@/lib/cover';
import type { FeaturedProperty } from '@/schema';

/** IP 타일: 대표 이미지 → 최근 콜라보 커버 → 이름만(격자 바탕) 순으로 그림을 고른다 */
export function IpTile({ property: p, collabs }: { property: FeaturedProperty; collabs: string }) {
  const cover = p.image ?? p.latestCover;
  return (
    <Link href={`/properties/${p.slug}`} className="ct-ip">
      <div className="ct-ip-cover">
        {cover ? (
          <CoverImage src={cover.url} width={cover.width} height={cover.height} sizes="(max-width: 640px) 50vw, 240px" />
        ) : (
          <div className="ct-ip-mono" data-tone={coverTone(p.kind.key) ?? undefined} aria-hidden="true">
            {p.name.value}
          </div>
        )}
        {p.ongoingCount > 0 && (
          <span className="ct-card-phase">
            <PhaseBadge phase="ongoing" />
          </span>
        )}
      </div>
      <span className="ct-ip-name">{p.name.value}</span>
      <span className="ct-ip-meta">
        {p.kind.label} · <span className="ct-mono">{collabs}</span>
      </span>
    </Link>
  );
}
