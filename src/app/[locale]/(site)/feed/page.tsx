import { Badge, Button, Flex, Text } from '@radix-ui/themes';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CollabCard } from '@/components/collab/CollabCard';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { ApiError, memberApi } from '@/lib/api';
import { getMemberSession, memberLoginPath } from '@/lib/auth/member';
import { LIST_PATH } from '@/lib/list-url';

export async function generateMetadata({ params }: PageProps<'/[locale]/feed'>): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: 'Member' });
  return { title: t('feed'), robots: { index: false, follow: false } };
}

/** 내 피드: 팔로우한 작품·회사의 발행 콜라보, 새로 올라온 것부터. 쿠키를 읽으므로 요청마다 렌더링된다 */
export default async function FeedPage({ params, searchParams }: PageProps<'/[locale]/feed'>) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const { cursor } = await searchParams;
  const here = `/${locale}/feed`;
  const session = await getMemberSession();
  if (!session) redirect(memberLoginPath(here));

  const me = memberApi(session.token);
  let follows, feed;
  try {
    [follows, feed] = await Promise.all([me.listFollows(locale), me.listFeed(locale, typeof cursor === 'string' ? cursor : undefined)]);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect(memberLoginPath(here, 'expired'));
    throw e;
  }
  const t = await getTranslations('Member');

  return (
    <>
      <header className="ct-hero">
        <div>
          <h1>{t('feed')}</h1>
          <p className="ct-stats-lead">{t('feedPage.description')}</p>
        </div>
      </header>

      {follows.length > 0 && (
        <section aria-label={t('feedPage.following')} style={{ marginBottom: 32 }}>
          <Text as="p" size="2" color="gray" mb="2">
            {t('feedPage.following')} · {follows.length}
          </Text>
          <Flex wrap="wrap" gap="2">
            {follows.map((f) => (
              <Badge key={`${f.type}:${f.slug}`} asChild size="2" variant="outline" color="gray" highContrast>
                <Link href={f.type === 'property' ? `/properties/${f.slug}` : `/companies/${f.slug}`}>
                  {f.name}
                  {f.kind && (
                    <Text color="gray" size="1">
                      {' '}
                      · {f.kind}
                    </Text>
                  )}
                </Link>
              </Badge>
            ))}
          </Flex>
        </section>
      )}

      {feed.items.length === 0 ? (
        <Flex direction="column" align="center" gap="2" py="9" px="4" className="ct-panel" style={{ textAlign: 'center' }}>
          <Text weight="medium">{follows.length === 0 ? t('feedPage.noFollows') : t('feedPage.empty')}</Text>
          <Text size="2" color="gray">
            {t('feedPage.hint')}
          </Text>
          <Button asChild variant="surface" color="gray" mt="3">
            <Link href={LIST_PATH}>{t('bookmarksPage.browse')}</Link>
          </Button>
        </Flex>
      ) : (
        <Flex direction="column" gap="6">
          <ul className="ct-grid">
            {feed.items.map((c) => (
              <li key={c.slug}>
                <CollabCard collab={c} />
              </li>
            ))}
          </ul>
          {feed.nextCursor && (
            <Flex justify="center">
              <Button asChild variant="surface" color="gray">
                <Link href={{ pathname: '/feed', query: { cursor: feed.nextCursor } }}>{t('bookmarksPage.more')}</Link>
              </Button>
            </Flex>
          )}
        </Flex>
      )}
    </>
  );
}
