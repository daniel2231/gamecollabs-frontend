import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { Button, Callout, Card, Flex, Heading, Text } from '@radix-ui/themes';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth/session';

export const metadata: Metadata = { title: '관리자 로그인', robots: { index: false } };

const ERRORS: Record<string, string> = {
  invalid_state: '로그인 요청이 만료되었습니다. 다시 시도하세요.',
  token_exchange_failed: 'GitHub 인증에 실패했습니다.',
  not_allowed: '허용되지 않은 GitHub 계정입니다.',
};

export default async function LoginPage({ params, searchParams }: PageProps<'/[locale]/admin/login'>) {
  const { locale } = await params;
  if (await getAdminSession()) redirect(`/${locale}/admin`);
  const { error, next } = await searchParams;
  const nextPath = typeof next === 'string' ? next : `/${locale}/admin`;
  return (
    <Flex align="center" justify="center" style={{ minHeight: '100vh' }} p="4">
      <Card size="4" style={{ width: 400, maxWidth: '100%' }}>
        <Flex direction="column" gap="4">
          <Heading as="h1" size="6">
            관리자 로그인
          </Heading>
          <Text color="gray" size="2">
            허용된 GitHub 계정만 들어올 수 있습니다.
          </Text>
          {typeof error === 'string' && (
            <Callout.Root color="red" size="1">
              <Callout.Text>{ERRORS[error] ?? '로그인에 실패했습니다.'}</Callout.Text>
            </Callout.Root>
          )}
          <Button asChild size="3" highContrast>
            <a href={`/api/auth/github/login?next=${encodeURIComponent(nextPath)}`}>
              <GitHubLogoIcon />
              GitHub로 로그인
            </a>
          </Button>
        </Flex>
      </Card>
    </Flex>
  );
}
