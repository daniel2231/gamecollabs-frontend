import { Badge, Button, Flex, Text } from '@radix-ui/themes';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/admin/AdminNav';
import { adminApi, isMockApi } from '@/lib/api';
import { devBypassEnabled, getAdminSession } from '@/lib/auth/session';

export const metadata: Metadata = { title: '관리자', robots: { index: false, follow: false } };

export default async function AdminLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);
  const { counts } = await adminApi(session.token).listQueue({ status: 'review' });

  return (
    <div className="ct-admin">
      <nav aria-label="관리자 메뉴" className="ct-admin-nav">
        <Flex align="center" gap="2" px="2" pb="4">
          <span className="ct-logo-mark" aria-hidden="true" style={{ width: 24, height: 24, fontSize: 13 }}>
            ×
          </span>
          <Text weight="bold">관리자</Text>
          {isMockApi() && (
            <Badge color="amber" variant="soft" size="1">
              mock
            </Badge>
          )}
        </Flex>
        <Suspense fallback={null}>
          <AdminNav counts={counts} />
        </Suspense>
        <Flex direction="column" gap="2" mt="6" px="2">
          <Text size="1" color="gray">
            {session.name ?? session.login}
            {devBypassEnabled() && ' · 인증 생략(개발)'}
          </Text>
          <Flex gap="2" wrap="wrap">
            <Button asChild size="1" variant="soft" color="gray">
              <a href={`/${locale}`}>사이트 보기</a>
            </Button>
            {!devBypassEnabled() && (
              <form action="/api/auth/logout" method="post">
                <Button size="1" variant="soft" color="gray" type="submit">
                  로그아웃
                </Button>
              </form>
            )}
          </Flex>
        </Flex>
      </nav>
      {children}
    </div>
  );
}
