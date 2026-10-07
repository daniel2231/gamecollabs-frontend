import { Cross2Icon, DownloadIcon } from '@radix-ui/react-icons';
import { Badge, Button, Flex, Heading, TabNav, Text } from '@radix-ui/themes';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CollabRow } from '@/components/collab/CollabRow';
import { FilterPanel } from '@/components/collab/FilterPanel';
import { SortSelect } from '@/components/collab/SortSelect';
import { CopyLinkButton } from '@/components/site/CopyLinkButton';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { hasActiveFilters, parseCollabQuery, serializeCollabQuery } from '@/lib/filters';
import { buildTree, labelMap } from '@/lib/taxonomy';
import { FACET_PARAMS, type CollabQuery } from '@/schema';

const PHASE_TABS = [undefined, 'ongoing', 'upcoming', 'ended'] as const;

export async function generateMetadata({ params, searchParams }: PageProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'List' });
  const query = parseCollabQuery(await searchParams);
  return {
    title: { absolute: `${t('title')} · ${(await getTranslations({ locale: locale as Locale, namespace: 'Site' }))('name')}` },
    // 필터 조합 페이지는 색인하지 않는다(중복 콘텐츠 방지)
    robots: hasActiveFilters(query) ? { index: false, follow: true } : undefined,
  };
}

export default async function CollabListPage({ params, searchParams }: PageProps<'/[locale]'>) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const query = parseCollabQuery(await searchParams);

  const [t, tPhase, terms, list, stats] = await Promise.all([
    getTranslations('List'),
    getTranslations('Phase'),
    api.getTaxonomies(),
    api.listCollabs(query, locale),
    api.getStats(),
  ]);

  const labels = labelMap(terms, locale);
  const facets = FACET_PARAMS.map((param) => ({ param, tree: buildTree(terms, param, locale) }));
  const href = (q: Partial<CollabQuery>) => `/${serializeCollabQuery({ ...query, ...q })}`;

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

  const csvParams = new URLSearchParams(serializeCollabQuery(query).slice(1));
  csvParams.set('locale', locale);

  return (
    <>
      <Flex wrap="wrap" align="center" justify="between" gap="4" mb="5">
        <Heading as="h1" size="8" style={{ letterSpacing: '-0.02em' }}>
          {t('title')}
        </Heading>
        <Flex wrap="wrap" gap="2">
          <CopyLinkButton label={t('copyLink')} copiedLabel={t('copied')} />
          <Button asChild size="2">
            <a href={`/api/export?${csvParams}`} download>
              <DownloadIcon />
              {t('exportCsv')}
            </a>
          </Button>
        </Flex>
      </Flex>

      <TabNav.Root aria-label={t('phaseTabs')} size="2" mb="5">
        {PHASE_TABS.map((phase) => (
          <TabNav.Link key={phase ?? 'all'} asChild active={query.phase === phase}>
            <Link href={href({ phase, limit: 20 })} scroll={false}>
              {phase ? tPhase(phase) : tPhase('all')}
              {phase && stats.byPhase[phase] > 0 && (
                <Text size="1" color="gray" ml="2" className="ct-mono">
                  {stats.byPhase[phase]}
                </Text>
              )}
            </Link>
          </TabNav.Link>
        ))}
      </TabNav.Root>

      <div className="ct-split">
        <FilterPanel query={query} facets={facets} />

        <section aria-label={t('results')} className="ct-main">
          <Flex direction="column" gap="4">
            <Flex wrap="wrap" align="center" gap="2">
              {chips.map((chip) => (
                <Badge key={chip.href} asChild size="2" radius="full" variant="soft">
                  <Link href={chip.href} scroll={false} aria-label={t('removeFilter', { label: chip.label })}>
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
            </Flex>

            {list.items.length === 0 ? (
              <Flex direction="column" align="center" gap="2" py="9" className="ct-panel">
                <Text weight="medium">{t('empty')}</Text>
                <Text size="2" color="gray">
                  {t('emptyHint')}
                </Text>
              </Flex>
            ) : (
              <ul className="ct-rows" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {list.items.map((item) => (
                  <li key={item.slug}>
                    <CollabRow collab={item} />
                  </li>
                ))}
              </ul>
            )}

            {list.nextCursor && query.limit < 100 && (
              <Flex justify="center">
                <Button asChild variant="surface" color="gray" size="3">
                  <Link href={href({ limit: Math.min(query.limit + 20, 100) })} scroll={false}>
                    {t('loadMore')}
                  </Link>
                </Button>
              </Flex>
            )}
          </Flex>
        </section>
      </div>
    </>
  );
}
