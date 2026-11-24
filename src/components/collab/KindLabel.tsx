import {
  AvatarIcon,
  CubeIcon,
  Crosshair2Icon,
  DiscIcon,
  ReaderIcon,
  TokensIcon,
  VideoIcon,
} from '@radix-ui/react-icons';
import type { ComponentType } from 'react';
import type { PartyRef } from '@/schema';

/** 게임 쪽 분류. 주최 작품은 거의 늘 게임이라 이 분류는 카드에 다시 쓰지 않는다 */
export const GAME_KIND = 'partner_category.game';

/** 분류 최상위 키별 아이콘. 하위 분류(partner_category.brand.food 등)는 최상위 아이콘을 따른다 */
const ICONS: Record<string, ComponentType<{ 'aria-hidden'?: boolean }>> = {
  'partner_category.game': Crosshair2Icon,
  'partner_category.anime_manga': ReaderIcon,
  'partner_category.film_tv': VideoIcon,
  'partner_category.music': DiscIcon,
  'partner_category.vtuber': AvatarIcon,
  'partner_category.brand': CubeIcon,
};

const rootOf = (key: string) => key.split('.').slice(0, 2).join('.');

/**
 * 카드의 분류 한 줄: 파트너 분류만 아이콘과 함께. 제목이 이미 "게임 × 파트너"라 같은 모양을 반복하지 않는다.
 * 주최 작품이 게임이 아닐 때(드물다)만 앞에 주최 분류를 붙인다.
 */
export function KindLabel({ host, partner }: { host?: PartyRef; partner?: PartyRef }) {
  const kind = partner?.kind ?? host?.kind;
  if (!kind) return null;
  const Icon = ICONS[rootOf(kind.key)] ?? TokensIcon;
  const hostPrefix = partner && host && rootOf(host.kind.key) !== GAME_KIND ? `${host.kind.label} × ` : '';
  return (
    <span className="ct-kind">
      <Icon aria-hidden />
      <span>
        {hostPrefix}
        {kind.label}
      </span>
    </span>
  );
}
