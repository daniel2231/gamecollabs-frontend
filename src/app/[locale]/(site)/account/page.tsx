import { Avatar, Card, Flex, Heading, Link as RadixLink, Text } from '@radix-ui/themes';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { ApiError, memberApi } from '@/lib/api';
import { discordAvatarUrl, displayName, getMemberSession, memberLoginPath } from '@/lib/auth/member';
import { DeleteAccount } from './DeleteAccount';

export async function generateMetadata({ params }: PageProps<'/[locale]/account'>): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: 'Member' });
  return { title: t('account'), robots: { index: false, follow: false } };
}

/** 내 계정: Discord 프로필, 저장·팔로우 수, 무엇을 저장하는지, 탈퇴 */
export default async function AccountPage({ params, searchParams }: PageProps<'/[locale]/account'>) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const here = `/${locale}/account`;
  const session = await getMemberSession();
  if (!session) redirect(memberLoginPath(here));

  let profile;
  try {
    profile = await memberApi(session.token).getMe();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect(memberLoginPath(here, 'expired'));
    throw e;
  }
  const t = await getTranslations('Member');
  const name = displayName(profile);

  return (
    <Flex direction="column" gap="6" style={{ maxWidth: 640 }}>
      <header className="ct-hero">
        <div>
          <h1>{t('account')}</h1>
        </div>
      </header>

      <Card size="3">
        <Flex align="center" gap="4" wrap="wrap">
          <Avatar src={discordAvatarUrl(profile, 128)} fallback={name.charAt(0) || '?'} size="5" radius="full" />
          <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
            <Text size="5" weight="bold">
              {name}
            </Text>
            <Text size="2" color="gray">
              {t('accountPage.discord', { username: profile.username })}
            </Text>
          </Flex>
        </Flex>
        <Flex gap="5" mt="4" wrap="wrap">
          <RadixLink asChild size="2" highContrast>
            <Link href="/bookmarks">{t('accountPage.bookmarkCount', { count: profile.bookmarkCount ?? 0 })}</Link>
          </RadixLink>
          <RadixLink asChild size="2" highContrast>
            <Link href="/feed">{t('accountPage.followCount', { count: profile.followCount ?? 0 })}</Link>
          </RadixLink>
        </Flex>
      </Card>

      <section>
        <Heading as="h2" size="4" mb="3">
          {t('accountPage.dataTitle')}
        </Heading>
        <ul className="ct-account-list">
          <li>{t('accountPage.dataProfile')}</li>
          <li>{t('accountPage.dataLists')}</li>
          <li>{t('accountPage.dataNot')}</li>
          <li>{t('accountPage.dataKeep')}</li>
        </ul>
      </section>

      <section>
        <Heading as="h2" size="4" mb="2">
          {t('accountPage.deleteTitle')}
        </Heading>
        <Text as="p" size="2" color="gray" mb="3">
          {t('accountPage.deleteDescription')}
        </Text>
        <DeleteAccount failed={(await searchParams).error === 'delete_failed'} />
      </section>
    </Flex>
  );
}
