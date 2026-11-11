import { Button, Flex, Text } from '@radix-ui/themes';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CollabCard } from '@/components/collab/CollabCard';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { ApiError, memberApi } from '@/lib/api';
import { getMemberSession, memberLoginPath } from '@/lib/auth/member';
import { LIST_PATH } from '@/lib/list-url';

export async function generateMetadata({ params }: PageProps<'/[locale]/bookmarks'>): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: 'Member' });
  return { title: t('bookmarks'), robots: { index: false, follow: false } };
}

/** 로그인한 회원이 저장한 콜라보(최근 저장순). 쿠키를 읽으므로 요청마다 렌더링된다 */
export default async function BookmarksPage({ params, searchParams }: PageProps<'/[locale]/bookmarks'>) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const { cursor } = await searchParams;
  const here = `/${locale}/bookmarks`;
  const session = await getMemberSession();
  if (!session) redirect(memberLoginPath(here));

  let list;
  try {
    list = await memberApi(session.token).listBookmarks(locale, typeof cursor === 'string' ? cursor : undefined);
  } catch (e) {
    // 탈퇴·차단 등으로 백엔드가 세션을 거부하면 다시 로그인하게 한다
    if (e instanceof ApiError && e.status === 401) redirect(memberLoginPath(here, 'expired'));
    throw e;
  }
  const t = await getTranslations('Member');

  return (
    <>
      <header className="ct-hero">
        <div>
          <h1>{t('bookmarks')}</h1>
          <p className="ct-stats-lead">
            {list.total > 0 ? `${t('bookmarksPage.count', { count: list.total })} · ` : ''}
            {t('bookmarksPage.description')}
          </p>
        </div>
      </header>
      {list.items.length === 0 ? (
        <Flex direction="column" align="center" gap="2" py="9" px="4" className="ct-panel" style={{ textAlign: 'center' }}>
          <Text weight="medium">{t('bookmarksPage.empty')}</Text>
          <Text size="2" color="gray">
            {t('bookmarksPage.emptyHint')}
          </Text>
          <Button asChild variant="surface" color="gray" mt="3">
            <Link href={LIST_PATH}>{t('bookmarksPage.browse')}</Link>
          </Button>
        </Flex>
      ) : (
        <Flex direction="column" gap="6">
          <ul className="ct-grid">
            {list.items.map((c) => (
              <li key={c.slug}>
                <CollabCard collab={c} />
              </li>
            ))}
          </ul>
          {list.nextCursor && (
            <Flex justify="center">
              <Button asChild variant="surface" color="gray">
                <Link href={{ pathname: '/bookmarks', query: { cursor: list.nextCursor } }}>{t('bookmarksPage.more')}</Link>
              </Button>
            </Flex>
          )}
        </Flex>
      )}
    </>
  );
}
