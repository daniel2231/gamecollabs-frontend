import { Badge, Card, DataList, Flex, Heading, Link as RadixLink, Text } from '@radix-ui/themes';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CountList, CsvLink, Distribution, StatGrid } from '@/components/entity/EntityParts';
import { EntityTimeline } from '@/components/entity/EntityTimeline';
import { TranslationBadge } from '@/components/collab/TranslationBadge';
import { Breadcrumb } from '@/components/site/Breadcrumb';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { formatMonth } from '@/lib/format';

type Props = PageProps<'/[locale]/properties/[slug]'>;

export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await api.getProperty(slug, locale as Locale);
  if (!p) return {};
  return {
    title: p.name.value,
    description: `${p.name.value} — ${p.kind.label} · ${p.stats.collabCount}`,
    alternates: {
      canonical: `/${locale}/properties/${slug}`,
      languages: { ko: `/ko/properties/${slug}`, en: `/en/properties/${slug}` },
    },
  };
}

export default async function PropertyPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const p = await api.getProperty(slug, locale);
  if (!p) notFound();
  const t = await getTranslations('Property');

  const items = p.collabs.map((c) => {
    const other = c.parties.find((x) => x.slug !== p.slug);
    return { ...c, heading: other?.name.value ?? c.title };
  });

  return (
    <>
      <Flex wrap="wrap" gap="6" align="end" justify="between" pb="6" mb="6" style={{ borderBottom: '1px solid var(--ct-line)' }}>
        <Flex direction="column" gap="2" style={{ minWidth: 0 }}>
          <Breadcrumb label={t('breadcrumb')} items={[{ label: t('breadcrumb') }, { label: p.kind.label }]} />
          <Flex align="center" gap="3" wrap="wrap">
            <Heading as="h1" size="9" style={{ letterSpacing: '-0.025em', lineHeight: 1.1 }} lang={p.name.fallback ? 'ko' : undefined}>
              {p.name.value}
            </Heading>
            {p.name.fallback && <TranslationBadge kind="fallback" />}
          </Flex>
          <Flex wrap="wrap" gap="3">
            {[locale === 'ko' ? p.nameEn : p.nameKo, p.name.original].filter(Boolean).map((n, i) => (
              <Text key={i} color="gray" size="3">
                {i > 0 && <span aria-hidden="true">· </span>}
                {n}
              </Text>
            ))}
          </Flex>
          {p.aliases.length > 0 && (
            <Flex wrap="wrap" align="center" gap="2" mt="1">
              <Text size="1" color="gray" mr="1">
                {t('aliases')}
              </Text>
              {p.aliases.map((a) => (
                <Badge key={a} color="gray" variant="soft">
                  {a}
                </Badge>
              ))}
            </Flex>
          )}
        </Flex>
        <StatGrid
          stats={[
            { label: t('stats.collabs'), value: String(p.stats.collabCount) },
            { label: t('stats.counterparts'), value: String(p.stats.counterpartCount) },
            { label: t('stats.latest'), value: formatMonth(p.stats.latestStart) ?? '—' },
          ]}
        />
      </Flex>

      <div className="ct-split">
        <EntityTimeline items={items} />

        <aside className="ct-side">
          <Flex direction="column" gap="4">
            <CountList title={t('counterparts')} items={p.counterparts} hrefPrefix="/properties" />
            <Distribution title={t('typeDistribution')} items={p.typeDistribution} />
            <Card size="2">
              <DataList.Root size="2">
                <DataList.Item>
                  <DataList.Label minWidth="80px">{t('info.kind')}</DataList.Label>
                  <DataList.Value>{p.kind.label}</DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label minWidth="80px">{t('info.franchise')}</DataList.Label>
                  <DataList.Value>
                    {p.parent ? (
                      <RadixLink asChild>
                        <Link href={`/properties/${p.parent.slug}`}>{p.parent.name}</Link>
                      </RadixLink>
                    ) : (
                      '—'
                    )}
                  </DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label minWidth="80px">{t('info.official')}</DataList.Label>
                  <DataList.Value>
                    {p.officialUrl ? (
                      <RadixLink href={p.officialUrl} target="_blank" rel="noopener noreferrer" underline="always">
                        {t('info.officialSite')}
                      </RadixLink>
                    ) : (
                      '—'
                    )}
                  </DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label minWidth="80px">{t('info.slug')}</DataList.Label>
                  <DataList.Value className="ct-mono">{p.slug}</DataList.Value>
                </DataList.Item>
              </DataList.Root>
            </Card>
            <CsvLink href={`/api/export?property=${p.slug}&locale=${locale}`} label={t('csv')} />
          </Flex>
        </aside>
      </div>
    </>
  );
}
