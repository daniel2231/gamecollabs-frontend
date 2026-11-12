'use client';

import { PersonIcon } from '@radix-ui/react-icons';
import { Avatar, Button, DropdownMenu } from '@radix-ui/themes';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { loginHref } from './loginHref';

type Me = { name: string; avatarUrl: string } | null;

/**
 * 헤더의 로그인 버튼 / 계정 메뉴. 공개 페이지는 정적이라 서버에서 쿠키를 읽지 않고,
 * 하이드레이션 뒤 /api/me로 상태를 받는다. 대부분은 로그아웃 상태라 처음엔 로그인 버튼을 그린다.
 */
export function AccountMenu() {
  const t = useTranslations('Member');
  const [me, setMe] = useState<Me>(null);
  const logout = useRef<HTMLFormElement>(null);
  // next/navigation의 경로는 로케일 접두사(/ko)를 포함한다
  const pathname = usePathname();

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/me', { signal: ctrl.signal, cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<{ member: Me }>) : { member: null }))
      .then((body) => setMe(body.member))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, []);

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
            <Link href="/bookmarks">{t('bookmarks')}</Link>
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
