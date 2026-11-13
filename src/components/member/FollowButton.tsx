'use client';

import { CheckIcon, PlusIcon } from '@radix-ui/react-icons';
import { Button, Flex, Text } from '@radix-ui/themes';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { FollowType } from '@/lib/api/types';
import { useMember } from './MemberProvider';

/** 작품·회사 팔로우. 팔로우한 대상의 새 콜라보는 내 피드(/feed)에 모인다 */
export function FollowButton({ type, slug }: { type: FollowType; slug: string }) {
  const t = useTranslations('Member');
  const { status, isFollowing, toggleFollow } = useMember();
  const [error, setError] = useState<string | null>(null);
  const on = isFollowing(type, slug);

  async function click() {
    setError(null);
    const err = await toggleFollow(type, slug);
    if (err) setError(err === 'limit' ? t('followLimit') : t('followFailed'));
  }

  return (
    <Flex align="center" gap="2" wrap="wrap">
      <Button
        variant={on ? 'soft' : 'surface'}
        color="gray"
        size="2"
        highContrast={on}
        aria-pressed={status === 'in' ? on : undefined}
        title={status === 'out' ? t('followHint') : undefined}
        disabled={status === 'loading'}
        onClick={click}
        style={{ whiteSpace: 'nowrap' }}
      >
        {on ? <CheckIcon /> : <PlusIcon />}
        {on ? t('following') : t('follow')}
      </Button>
      {error && (
        <Text size="1" color="red" role="status">
          {error}
        </Text>
      )}
    </Flex>
  );
}
