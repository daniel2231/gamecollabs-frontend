'use client';

import { PersonIcon } from '@radix-ui/react-icons';
import { Avatar, Button, DropdownMenu } from '@radix-ui/themes';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { Link } from '@/i18n/navigation';
import { loginHref } from './loginHref';
import { useMember } from './MemberProvider';

/**
 * 헤더의 로그인 버튼 / 계정 메뉴. 상태는 MemberProvider가 받아 온다.
 * 대부분은 로그아웃 상태라 확인 전에도 로그인 버튼을 그린다.
 */
export function AccountMenu() {
  const t = useTranslations('Member');
  const { me } = useMember();
  const logout = useRef<HTMLFormElement>(null);
  // next/navigation의 경로는 로케일 접두사(/ko)를 포함한다
  const pathname = usePathname();

  if (!me) {
    return (
      <Button asChild variant="ghost" color="gray" size="2" style={{ marginInline: 0 }}>
        {/* 클릭하는 순간의 주소로 돌아오도록 href를 그때 바꾼다 */}
        <a href="/api/auth/discord/login" onClick={(e) => (e.currentTarget.href = loginHref())} rel="nofollow">
          <PersonIcon className="ct-signin-icon" aria-hidden="true" />
          <span className="ct-signin-label">{t('signIn')}</span>
        </a>
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="ghost" color="gray" size="2" aria-label={t('accountMenu', { name: me.name })} style={{ marginInline: 0 }}>
            <Avatar src={me.avatarUrl} fallback={me.name.charAt(0) || '?'} size="1" radius="full" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" variant="soft" style={{ minWidth: 180 }}>
          <DropdownMenu.Label>{me.name}</DropdownMenu.Label>
          <DropdownMenu.Item asChild>
            <Link href="/feed">{t('feed')}</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href="/bookmarks">{t('bookmarks')}</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href="/account">{t('account')}</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item onSelect={() => logout.current?.requestSubmit()}>{t('signOut')}</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <form ref={logout} method="post" action="/api/auth/discord/logout" hidden>
        <input type="hidden" name="next" value={pathname} />
      </form>
    </>
  );
}
