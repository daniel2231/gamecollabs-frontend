import { Cross2Icon } from '@radix-ui/react-icons';
import { Badge, Button, Flex, Heading, Link as RadixLink, Text } from '@radix-ui/themes';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CollabCard } from '@/components/collab/CollabCard';
import { FilterPanel } from '@/components/collab/FilterPanel';
import { SortSelect } from '@/components/collab/SortSelect';
import { AutoLoadMore } from '@/components/site/AutoLoadMore';
import { CopyLinkButton } from '@/components/site/CopyLinkButton';
import { JsonLd } from '@/components/site/JsonLd';
import { LinkPending } from '@/components/site/Pending';
import { SignalX } from '@/components/site/SignalX';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { groupByStartMonth } from '@/lib/format';
import { EMPTY_FILTERS, hasActiveFilters, hasFilterPanelValues, LIST_PATH, listHref, parseCollabQuery } from '@/lib/filters';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { landingOf, landingPath, type Landing } from '@/lib/landing';
import { alternatesFor, defaultOgImage, openGraphFor } from '@/lib/seo';
import { siteUrl } from '@/lib/site';
import { buildTree, labelMap } from '@/lib/taxonomy';
import { FACET_PARAMS, type CollabQuery, type Phase, type TaxonomyTerm } from '@/schema';

const PHASE_TABS = [undefined, 'ongoing', 'upcoming', 'ended'] as const;

/** 랜딩 페이지 제목. 분류 키가 없거나 폐기된 항목이면 null(랜딩으로 보지 않는다) */
async function landingTitle(landing: Landing | null, terms: TaxonomyTerm[], locale: Locale): Promise<string | null> {
  if (!landing) return null;
  const t = await getTranslations({ locale, namespace: 'List' });
  if (landing.param === 'phase') return t(`landing.phase.${landing.key}`);
  const label = terms.find((x) => x.key === landing.key && !x.deprecated)?.label[locale];
  return label ? t(`landing.${landing.param}`, { label }) : null;
}

export async function generateMetadata({ params, searchParams }: PageProps<'/[locale]/collabs'>): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const query = parseCollabQuery(await searchParams);
  const landing = landingOf(query);
  const [t, tSite, terms, list] = await Promise.all([
    getTranslations({ locale, namespace: 'List' }),
    getTranslations({ locale, namespace: 'Site' }),
    landing ? api.getTaxonomies() : [],
    landing ? api.listCollabs(query, locale) : null,
  ]);
  const heading = await landingTitle(landing, terms, locale);
  const siteName = tSite('name');

  // 필터 하나짜리 랜딩: 결과가 있을 때만 색인. canonical은 그 필터만 남긴 주소
  if (landing && heading && list && list.total > 0) {
    const path = landingPath(landing);
    const title = `${heading} · ${siteName}`;
    const description = t('landingDescription', { title: heading, count: list.total });
    return {
      title: { absolute: title },
      description,
      alternates: alternatesFor(locale, path),
      openGraph: openGraphFor({ locale, path, siteName, title, description, images: [defaultOgImage(locale)] }),
    };
  }

  const title = `${t('title')} · ${siteName}`;
  return {
    title: { absolute: title },
    description: tSite('description'),
    // 정렬·더 보기 주소와 색인하지 않는 필터 페이지의 canonical은 필터 없는 목록
    alternates: alternatesFor(locale, LIST_PATH),
    openGraph: openGraphFor({
      locale,
      path: LIST_PATH,
      siteName,
      title,
      description: tSite('description'),
      images: [defaultOgImage(locale)],
    }),
    // 검색어·기간·여러 필터 조합, 결과 없는 랜딩은 색인하지 않는다(중복·빈 콘텐츠 방지)
    robots: hasActiveFilters(query) ? { index: false, follow: true } : undefined,
  };
}

export default async function CollabListPage({ params, searchParams }: PageProps<'/[locale]/collabs'>) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const query = parseCollabQuery(await searchParams);

  const [t, tPhase, tSite, terms, list, stats] = await Promise.all([
    getTranslations('List'),
    getTranslations('Phase'),
    getTranslations('Site'),
    api.getTaxonomies(),
    api.listCollabs(query, locale),
    api.getStats(),
  ]);

  const landing = landingOf(query);
  const heading = await landingTitle(landing, terms, locale);
  // 시작일 정렬이면 시작 월별로 묶는다. 다음 페이지가 남아 있으면 마지막 달은 일부만 불러온 상태라
  // 그 달의 전체 개수를 따로 받아 온다(불러온 개수만 세면 '더 보기'를 눌러야 숫자가 맞아진다)
  const groups = (query.sort === 'recent' ? [] : groupByStartMonth(list.items)).map((g) => ({ ...g, total: g.items.length }));
  const lastGroup = groups.at(-1);
  if (lastGroup && list.nextCursor) {
    lastGroup.total = lastGroup.key
      ? (await api.listCollabs({ ...query, from: lastGroup.key, to: lastGroup.key, limit: 1, cursor: undefined }, locale)).total
      : // 시기 미상은 항상 맨 뒤에 오므로 남은 전부가 미상이다
        list.total - (list.items.length - lastGroup.items.length);
  }

  const labels = labelMap(terms, locale);
  const facets = FACET_PARAMS.map((param) => ({ param, tree: buildTree(terms, param, locale) }));
  const monthLabel = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', timeZone: 'UTC' });
  const href = (q: Partial<CollabQuery>) => listHref({ ...query, ...q });
  // 상태 미상 탭은 그런 콜라보가 있거나 지금 그 탭을 보고 있을 때만
  const tabs: readonly (Phase | undefined)[] =
    (stats.byPhase.unknown ?? 0) > 0 || query.phase === 'unknown' ? [...PHASE_TABS, 'unknown'] : PHASE_TABS;

  const hasFacetFilters = hasFilterPanelValues(query);
  const chips: { label: string; href: string }[] = [
    ...(query.q ? [{ label: t('searchChip', { q: query.q }), href: href({ q: undefined, limit: 20 }) }] : []),
    ...FACET_PARAMS.flatMap((f) =>
      query[f].map((key) => ({
        label: labels.get(key) ?? key,
        href: href({ [f]: query[f].filter((k) => k !== key), limit: 20 }),
      })),
    ),
    ...(query.from || query.to
      ? [
          {
            label: `${query.from?.replace('-', '.') ?? '…'} – ${query.to?.replace('-', '.') ?? '…'}`,
            href: href({ from: undefined, to: undefined, limit: 20 }),
          },
        ]
      : []),
  ];

  return (
    <>
      {heading && landing && (
        <JsonLd
          data={breadcrumbJsonLd([
            { name: tSite('nav.collabs'), url: `${siteUrl()}/${locale}${LIST_PATH}` },
            { name: heading, url: `${siteUrl()}/${locale}${landingPath(landing)}` },
          ])}
        />
      )}
      <header className="ct-hero">
        <h1>
          <SignalX text={heading ?? t('title')} />
        </h1>
      </header>

      <nav aria-label={t('phaseTabs')}>
        <ul className="ct-tabs">
          {tabs.map((phase) => {
            const count = phase ? (stats.byPhase[phase] ?? 0) : stats.published;
            return (
              <li key={phase ?? 'all'}>
                <Link href={href({ phase, limit: 20 })} scroll={false} aria-current={query.phase === phase ? 'page' : undefined}>
                  <LinkPending />
                  {phase ? tPhase(phase) : tPhase('all')}
                  <sup data-zero={count === 0 || undefined}>{count}</sup>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="ct-split">
        <FilterPanel query={query} facets={facets} />

        <section aria-label={t('results')} className="ct-main">
          <Flex direction="column" gap="4">
            <Flex wrap="wrap" align="center" gap="2">
              {chips.map((chip) => (
                <Badge key={chip.href} asChild size="2" variant="outline" color="gray" highContrast className="ct-chip">
                  <Link href={chip.href} scroll={false} aria-label={t('removeFilter', { label: chip.label })}>
                    <LinkPending />
                    {chip.label}
                    <Cross2Icon aria-hidden="true" />
                  </Link>
                </Badge>
              ))}
              <span style={{ flex: 1 }} />
              <Text size="2" color="gray" aria-live="polite">
                {t.rich('resultCount', {
                  count: list.total,
                  strong: (chunks) => (
                    <Text weight="bold" highContrast className="ct-mono">
                      {chunks}
                    </Text>
                  ),
                })}
              </Text>
              <SortSelect query={query} />
              <CopyLinkButton label={t('copyLink')} copiedLabel={t('copied')} failedLabel={t('copyFailed')} variant="ghost" />
            </Flex>

            {/* 필터·탭·정렬을 바꾸는 동안 결과 위에서 흐르는 진행선(globals.css의 .ct-progress) */}
            <div className="ct-progress" aria-hidden="true" />
            {/* 필터·탭·정렬을 바꾸는 동안 흐려지는 영역 */}
            <Flex direction="column" gap="4" className="ct-pending-target">
              {list.items.length === 0 ? (
                <Flex direction="column" align="center" gap="2" py="9" px="4" className="ct-panel" style={{ textAlign: 'center' }}>
                  <Text weight="medium">{t('empty')}</Text>
                  <Text size="2" color="gray">
                    {chips.length > 0 ? t('emptyHint') : t('emptyPhaseHint')}
                  </Text>
                  {/* 막다른 화면이 되지 않게: 조건을 푸는 버튼과, 그래도 없으면 제보로 */}
                  <Flex wrap="wrap" justify="center" gap="2" mt="3">
                    {query.q && (
                      <Button asChild variant="surface" color="gray">
                        <Link href={href({ q: undefined, limit: 20 })} scroll={false}>
                          <LinkPending spinner dim={false} />
                          {t('clearSearch')}
                        </Link>
                      </Button>
                    )}
                    {hasFacetFilters && (
                      <Button asChild variant="surface" color="gray">
                        <Link href={href({ ...EMPTY_FILTERS, limit: 20 })} scroll={false}>
                          <LinkPending spinner dim={false} />
                          {t('clearFilters')}
                        </Link>
                      </Button>
                    )}
                    {chips.length === 0 && query.phase && (
                      <Button asChild variant="surface" color="gray">
                        <Link href={href({ phase: undefined, limit: 20 })} scroll={false}>
                          <LinkPending spinner dim={false} />
                          {t('showAllPhases')}
                        </Link>
                      </Button>
                    )}
                  </Flex>
                  <Text size="2" color="gray" mt="3">
                    {t.rich('emptyReport', {
                      link: (chunks) => (
                        <RadixLink asChild highContrast underline="always">
                          <Link href="/report">{chunks}</Link>
                        </RadixLink>
                      ),
                    })}
                  </Text>
                </Flex>
              ) : query.sort === 'recent' ? (
                <ul className="ct-grid">
                  {list.items.map((item) => (
                    <li key={item.slug}>
                      <CollabCard collab={item} />
                    </li>
                  ))}
                </ul>
              ) : (
                // 시작일 정렬일 때는 시작 월별로 나눠 보여준다
                groups.map((group) => (
                  <section key={group.key || 'unknown'} aria-labelledby={`month-${group.key || 'unknown'}`} className="ct-month">
                    <Heading as="h2" id={`month-${group.key || 'unknown'}`} className="ct-month-heading">
                      {group.key ? monthLabel.format(new Date(`${group.key}-01T00:00:00Z`)) : t('unknownMonth')}
                      <span className="ct-month-count">{t('monthCount', { count: group.total })}</span>
                    </Heading>
                    <ul className="ct-grid">
                      {group.items.map((item) => (
                        <li key={item.slug}>
                          <CollabCard collab={item} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </Flex>

            {/* 목록 끝에 닿으면 저절로 다음 20개를 불러온다(버튼은 대기 표시·JS 없는 경우용) */}
            {list.nextCursor && query.limit < 100 && (
              <AutoLoadMore href={href({ limit: Math.min(query.limit + 20, 100) })}>
                <Flex justify="center">
                  <Button asChild variant="surface" color="gray" size="3">
                    <Link href={href({ limit: Math.min(query.limit + 20, 100) })} scroll={false} replace>
                      <LinkPending spinner dim={false} />
                      {t('loadMore')}
                    </Link>
                  </Button>
                </Flex>
              </AutoLoadMore>
            )}
          </Flex>
        </section>
      </div>
    </>
  );
}
