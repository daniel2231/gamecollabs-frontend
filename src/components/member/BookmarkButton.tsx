'use client';

import { BookmarkFilledIcon, BookmarkIcon } from '@radix-ui/react-icons';
import { Button, IconButton, Text } from '@radix-ui/themes';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useMember } from './MemberProvider';

/**
 * 콜라보 저장 버튼. 상세 페이지는 글자 버튼, 카드 위에는 아이콘(icon). 로그아웃 상태에서 누르면 로그인으로 간다.
 * 저장 여부는 MemberProvider가 페이지마다 한 번 받아 온 목록에서 읽는다.
 */
export function BookmarkButton({ slug, title, variant = 'button' }: { slug: string; title?: string; variant?: 'button' | 'icon' }) {
  const t = useTranslations('Member');
  const { status, isBookmarked, toggleBookmark } = useMember();
  const [error, setError] = useState<string | null>(null);
  const on = isBookmarked(slug);
  const pressed = status === 'in' ? on : undefined;

  async function click() {
    setError(null);
    const err = await toggleBookmark(slug);
    if (err) setError(err === 'limit' ? t('saveLimit') : t('saveFailed'));
  }

  if (variant === 'icon') {
    const label = title ? t(on ? 'unsaveNamed' : 'saveNamed', { title }) : t(on ? 'saved' : 'save');
    return (
      <IconButton
        type="button"
        size="2"
        variant={on ? 'solid' : 'soft'}
        color="gray"
        highContrast={on}
        className="ct-card-save"
        aria-label={error ?? label}
        aria-pressed={pressed}
        title={error ?? (status === 'out' ? t('saveHint') : label)}
        disabled={status === 'loading'}
        onClick={click}
      >
        {on ? <BookmarkFilledIcon /> : <BookmarkIcon />}
      </IconButton>
    );
  }

  return (
    <>
      <Button
        variant={on ? 'soft' : 'surface'}
        color="gray"
        size="2"
        highContrast={on}
        aria-pressed={pressed}
        title={status === 'out' ? t('saveHint') : undefined}
        disabled={status === 'loading'}
        onClick={click}
        style={{ whiteSpace: 'nowrap' }}
      >
        {on ? <BookmarkFilledIcon /> : <BookmarkIcon />}
        {on ? t('saved') : t('save')}
      </Button>
      {error && (
        <Text size="1" color="red" role="status" style={{ alignSelf: 'center' }}>
          {error}
        </Text>
      )}
    </>
  );
}
