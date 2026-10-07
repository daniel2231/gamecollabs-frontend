import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Badge, Button, Card, DataList, Flex, Heading, Link as RadixLink, Table, Text, Tooltip } from '@radix-ui/themes';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PhaseBadge } from '@/components/collab/PhaseBadge';
import { TranslationBadge } from '@/components/collab/TranslationBadge';
import { Breadcrumb } from '@/components/site/Breadcrumb';
import { CopyLinkButton } from '@/components/site/CopyLinkButton';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { formatDate, formatPeriod } from '@/lib/format';
import type { CollabDetail } from '@/schema';

type Props = PageProps<'/[locale]/collabs/[slug]'>;

// ISR: 첫 요청 때 렌더링 후 캐시. 발행·수정 시 revalidate 웹훅으로 갱신
export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const collab = await api.getCollab(slug, locale as Locale);
  if (!collab) return {};
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Site' });
  const description = collab.summary || t('description');
  return {
    title: collab.title,
    description: description.slice(0, 160),
    alternates: {
      canonical: `/${locale}/collabs/${slug}`,
      languages: { ko: `/ko/collabs/${slug}`, en: `/en/collabs/${slug}` },
    },
    openGraph: { type: 'article', title: collab.title, description: description.slice(0, 160) },
  };
}

export default async function CollabDetailPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const collab = await api.getCollab(slug, locale);
  if (!collab) notFound();

  const [t, tPeriod, tPhase, tRole] = await Promise.all([
    getTranslations('Detail'),
    getTranslations('Period'),
    getTranslations('Phase'),
    getTranslations('Role'),
  ]);
  const partner = collab.parties.find((p) => p.role === 'partner');
  const tags = [...collab.regions, ...collab.platforms, ...collab.collabTypes];
  const start = formatDate(collab.period.start, collab.period.precision);
  const end =
    collab.period.endKind === 'permanent'
      ? tPeriod('permanent')
      : collab.period.endKind === 'tba' || !collab.period.end
        ? tPeriod('tba')
        : formatDate(collab.period.end, collab.period.precision);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: collab.title,
    ...(collab.period.start && collab.period.precision !== 'unknown' ? { startDate: collab.period.start } : {}),
    ...(collab.period.endKind === 'fixed' && collab.period.end ? { endDate: collab.period.end } : {}),
    ...(collab.summary ? { description: collab.summary } : {}),
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    organizer: collab.companies.map((c) => ({ '@type': 'Organization', name: c.name.value })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <Breadcrumb label={t('breadcrumb')} items={[{ href: '/', label: (await getTranslations('Site.nav'))('collabs') }, { label: collab.title }]} />

      <div className="ct-split">
        <article className="ct-main">
          <Flex direction="column" gap="7">
            <Flex direction="column" gap="3">
              <Flex wrap="wrap" align="center" gap="2">
                <PhaseBadge phase={collab.phase} size="2" />
                {tags.map((tag) => (
                  <Badge key={tag.key} color="gray" variant="soft" size="2">
                    {tag.label}
                  </Badge>
                ))}
              </Flex>
              <Flex align="center" gap="3" wrap="wrap">
                <Heading as="h1" size="8" style={{ letterSpacing: '-0.02em' }} lang={collab.fallback ? 'ko' : undefined}>
                  {collab.title}
                </Heading>
              </Flex>
            </Flex>

            {collab.cover && (
              <figure style={{ margin: 0 }}>
                <img
                  src={collab.cover.url}
                  alt={collab.cover.alt}
                  width={collab.cover.width}
                  height={collab.cover.height}
                  style={{ width: '100%', height: 'auto', borderRadius: 8, border: '1px solid var(--ct-line)' }}
                />
                {collab.cover.credit && (
                  <Text as="p" size="1" color="gray" mt="2">
                    {t('coverCredit', { credit: collab.cover.credit })}
                    {collab.cover.originalUrl && (
                      <>
                        {' · '}
                        <RadixLink href={collab.cover.originalUrl} target="_blank" rel="noopener noreferrer" color="gray">
                          ↗
                        </RadixLink>
                      </>
                    )}
                  </Text>
                )}
              </figure>
            )}

            <section className="ct-stat-grid" aria-label={t('status')}>
              <div>
                <Text as="div" size="1" color="gray">
                  {t('start')}
                </Text>
                <Text as="div" size="5" weight="medium" className={start ? 'ct-mono' : undefined}>
                  {start ?? tPeriod('unknown')}
                </Text>
                <Text as="div" size="1" color="gray">
                  {tPeriod(`precision.${collab.period.precision}`)}
                </Text>
              </div>
              <div>
                <Text as="div" size="1" color="gray">
                  {t('end')}
                </Text>
                <Text as="div" size="5" weight="medium" className={collab.period.endKind === 'fixed' && start ? 'ct-mono' : undefined}>
                  {start ? end : tPeriod('unknown')}
                </Text>
                <Text as="div" size="1" color="gray">
                  {tPeriod(`endKind.${collab.period.endKind}`)}
                </Text>
              </div>
              <div>
                <Text as="div" size="1" color="gray">
                  {t('status')}
                </Text>
                <Text as="div" size="5" weight="medium" color={collab.phase === 'ongoing' ? 'grass' : undefined}>
                  {tPhase(collab.phase)}
                </Text>
                <Text as="div" size="1" color="gray">
                  {t('computed')}
                </Text>
              </div>
            </section>

            <Section title={t('summary')}>
              <Flex gap="2" mb="1">
                {collab.machineTranslated && <TranslationBadge />}
              </Flex>
              {collab.summary ? (
                <Text as="p" style={{ maxWidth: '68ch', whiteSpace: 'pre-line' }} lang={collab.summaryFallback ? 'ko' : undefined}>
                  {collab.summary}
                </Text>
              ) : (
                <Text as="p" color="gray">
                  {t('summaryEmpty')}
                </Text>
              )}
              {collab.note && (
                <Text as="p" size="2" color="gray" mt="2">
                  {collab.note}
                </Text>
              )}
            </Section>

            {collab.parties.length > 0 && (
              <Section title={t('parties')}>
                <div className="ct-two">
                  {collab.parties.map((p) => (
                    <Link key={p.slug} href={`/properties/${p.slug}`} className="ct-card-link">
                      <Text size="1" color="gray">
                        {tRole(p.role)} · {p.kind.label}
                      </Text>
                      <Text size="4" weight="bold">
                        {p.name.value}
                      </Text>
                      {p.name.original && (
                        <Text size="2" color="gray">
                          {p.name.original}
                        </Text>
                      )}
                      <Text size="2" weight="medium" mt="1">
                        {t('seeAll')}
                      </Text>
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {collab.companies.length > 0 && (
              <Section title={t('companies')}>
                <Card size="1" style={{ padding: 0 }}>
                  {collab.companies.map((c, i) => (
                    <Flex
                      key={`${c.slug}-${c.role}`}
                      wrap="wrap"
                      justify="between"
                      gap="2"
                      px="4"
                      py="3"
                      style={i ? { borderTop: '1px solid var(--ct-line-soft)' } : undefined}
                    >
                      <RadixLink asChild weight="medium" highContrast underline="hover">
                        <Link href={`/companies/${c.slug}`}>{c.name.value}</Link>
                      </RadixLink>
                      <Badge variant="soft" size="2">
                        {tRole(c.role)}
                      </Badge>
                    </Flex>
                  ))}
                </Card>
              </Section>
            )}

            <Section title={t('sources')}>
              <Sources collab={collab} />
            </Section>
          </Flex>
        </article>

        <aside className="ct-side">
          <Flex direction="column" gap="4">
            <Card size="2">
              <Text as="div" weight="bold" mb="3">
                {t('classification')}
              </Text>
              <DataList.Root size="2" orientation="horizontal">
                <Item label={t('labels.category')} value={collab.category?.label} none={t('none')} />
                <Item label={t('labels.partner')} value={partner?.kind.label} none={t('none')} />
                <Item label={t('labels.region')} value={collab.regions.map((r) => r.label).join(', ')} none={t('none')} />
                <Item label={t('labels.platform')} value={collab.platforms.map((r) => r.label).join(', ')} none={t('none')} />
                <Item label={t('labels.type')} value={collab.collabTypes.map((r) => r.label).join(', ')} none={t('none')} />
              </DataList.Root>
            </Card>
            <Flex gap="2">
              <CopyLinkButton label={t('copyLink')} copiedLabel={t('copied')} fullWidth />
              <Tooltip content={t('reportSoon')}>
                <Button variant="surface" color="gray" size="2" style={{ flex: 1 }} disabled>
                  <ExclamationTriangleIcon />
                  {t('report')}
                </Button>
              </Tooltip>
            </Flex>
            <Text as="p" size="1" color="gray" m="0">
              {t('updated', { date: collab.updatedAt.slice(0, 10) })}
            </Text>

            {collab.related.length > 0 && (
              <Flex direction="column" gap="2" mt="2">
                <Text weight="bold">{t('related')}</Text>
                {collab.related.map((r) => (
                  <Link key={r.slug} href={`/collabs/${r.slug}`} className="ct-card-link" style={{ padding: '12px 14px', gap: 2 }}>
                    <Text size="1" color="gray">
                      {t(`relation.${r.relation}`)}
                    </Text>
                    <Text weight="medium">{r.title}</Text>
                    <Text size="1" color="gray" className="ct-mono">
                      {formatPeriod(r.period, { unknown: tPeriod('unknown'), permanent: tPeriod('permanent'), tba: tPeriod('tba') })}
                    </Text>
                  </Link>
                ))}
              </Flex>
            )}
          </Flex>
        </aside>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <Heading as="h2" size="5" mb="3">
        {title}
      </Heading>
      {children}
    </section>
  );
}

function Item({ label, value, none }: { label: string; value?: string; none: string }) {
  return (
    <DataList.Item>
      <DataList.Label minWidth="88px">{label}</DataList.Label>
      <DataList.Value>{value || <Text color="gray">{none}</Text>}</DataList.Value>
    </DataList.Item>
  );
}

async function Sources({ collab }: { collab: CollabDetail }) {
  const t = await getTranslations('Detail');
  return (
    <Table.Root variant="surface" size="2">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>{t('sourceColumns.type')}</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>{t('sourceColumns.title')}</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>{t('sourceColumns.accessed')}</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {collab.sources.map((s) => (
          <Table.Row key={s.url}>
            <Table.Cell>
              <Badge variant="soft" color="gray" highContrast={s.type === 'official'}>
                {t(`sourceType.${s.type}`)}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              <RadixLink href={s.url} target="_blank" rel="noopener noreferrer" weight="medium" highContrast underline="always">
                {s.title}
              </RadixLink>
              <Text as="div" size="2" color="gray">
                {s.publisher}
                {s.isPrimary && ` · ${t('primary')}`}
                {s.archiveUrl && (
                  <>
                    {' · '}
                    <RadixLink href={s.archiveUrl} target="_blank" rel="noopener noreferrer" color="gray">
                      {t('archived')}
                    </RadixLink>
                  </>
                )}
              </Text>
            </Table.Cell>
            <Table.Cell className="ct-mono" style={{ whiteSpace: 'nowrap' }}>
              {s.accessedAt}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
