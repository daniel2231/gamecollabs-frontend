import { DiscordLogoIcon } from '@radix-ui/react-icons';
import { Button, Callout, Card, Flex, Heading, Text } from '@radix-ui/themes';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { getMemberSession, safeMemberNext } from '@/lib/auth/member';

const ERRORS = ['expired', 'cancelled', 'invalid_state', 'token_exchange_failed', 'profile_failed', 'disabled'] as const;

export async function generateMetadata({ params }: PageProps<'/[locale]/login'>): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: 'Member.login' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

/**
 * 회원 로그인(Discord). 헤더의 로그인 버튼은 바로 Discord로 보내므로, 이 화면은 주로
 * 로그인 실패 안내와 로그인이 필요한 화면(저장한 콜라보)에서 온 방문자를 위한 것이다.
 * 이미 로그인했어도 자동으로 넘기지 않는다: 세션이 백엔드에서 거부된 경우 다시 로그인해 쿠키를 새로 받아야 한다.
 */
export default async function LoginPage({ params, searchParams }: PageProps<'/[locale]/login'>) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [{ error, next }, t, session] = await Promise.all([searchParams, getTranslations('Member'), getMemberSession()]);
  const nextPath = safeMemberNext(typeof next === 'string' ? next : null, locale);
  const errorKey = typeof error === 'string' ? ((ERRORS as readonly string[]).includes(error) ? error : 'default') : null;

  return (
    <Flex justify="center" py="6">
      <Card size="4" style={{ width: 440, maxWidth: '100%' }}>
        <Flex direction="column" gap="4">
          <Heading as="h1" size="6">
            {t('login.title')}
          </Heading>
          <Text color="gray" size="2">
            {t('login.description')}
          </Text>
          {errorKey && (
            <Callout.Root color="red" size="1" role="alert">
              <Callout.Text>{t(`login.errors.${errorKey}` as 'login.errors.default')}</Callout.Text>
            </Callout.Root>
          )}
          {session && !errorKey && (
            <Callout.Root color="gray" size="1">
              <Callout.Text>{t('login.signedIn', { name: session.name })}</Callout.Text>
            </Callout.Root>
          )}
          <Button asChild size="3" highContrast>
            <a href={`/api/auth/discord/login?next=${encodeURIComponent(nextPath)}`} rel="nofollow">
              <DiscordLogoIcon />
              {t('signInWithDiscord')}
            </a>
          </Button>
          <Text color="gray" size="1">
            {t('login.privacy')}
          </Text>
        </Flex>
      </Card>
    </Flex>
  );
}
