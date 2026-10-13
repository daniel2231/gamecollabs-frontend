import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Badge, Button, Card, Flex, Heading, Link as RadixLink, Table, Text, Tooltip } from '@radix-ui/themes';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PhaseBadge } from '@/components/collab/PhaseBadge';
import { Breadcrumb } from '@/components/site/Breadcrumb';
import { CopyLinkButton } from '@/components/site/CopyLinkButton';
import { JsonLd } from '@/components/site/JsonLd';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { formatDate, formatPeriod } from '@/lib/format';
import { breadcrumbJsonLd, collabJsonLd } from '@/lib/jsonld';
import { landingPath } from '@/lib/landing';
import { alternatesFor, openGraphFor } from '@/lib/seo';
import { siteUrl } from '@/lib/site';
import type { CollabDetail, FacetParam, TermRef } from '@/schema';

type Props = PageProps<'/[locale]/collabs/[slug]'>;

// ISR: 첫 요청 때 렌더링 후 캐시. 발행·수정 시 revalidate 웹훅으로 갱신
export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  const collab = await api.getCollab(slug, locale);
  if (!collab) return {};
  const t = await getTranslations({ locale, namespace: 'Site' });
  const description = (collab.summary || t('description')).slice(0, 160);
  const path = `/collabs/${slug}`;
  return {
    title: collab.title,
    description,
    alternates: alternatesFor(locale, path),
    openGraph: openGraphFor({
      locale,
      path,
      siteName: t('name'),
      type: 'article',
      title: collab.title,
      description,
      ...(collab.publishedAt ? { publishedTime: collab.publishedAt } : {}),
      modifiedTime: collab.updatedAt,
    }),
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
  const start = formatDate(collab.period.start, collab.period.precision);
  const end =
    collab.period.endKind === 'permanent'
      ? tPeriod('permanent')
      : collab.period.endKind === 'tba' || !collab.period.end
        ? tPeriod('tba')
        : formatDate(collab.period.end, collab.period.precision);
  const navLabel = (await getTranslations('Site.nav'))('collabs');
  const base = siteUrl();
  const url = `${base}/${locale}/collabs/${slug}`;
  const jsonLd = [
    collabJsonLd(collab, { url, locale }),
    breadcrumbJsonLd([{ name: navLabel, url: `${base}/${locale}` }, { name: collab.title }]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      {/* 가운데 한 열: 머리 → 핵심 정보 → 내용 → 출처 → 다음에 볼 것 */}
      <div className="ct-article">
        <Breadcrumb label={t('breadcrumb')} items={[{ href: '/', label: navLabel }, { label: collab.title }]} />
        <article>
          <Flex direction="column" gap="7">
              <header>
                <Flex direction="column" gap="3">
                  <Flex align="center" gap="2" wrap="wrap">
                    <PhaseBadge phase={collab.phase} size="2" />
                    <Text size="1" color="gray">
                      {t('updated', { date: collab.updatedAt.slice(0, 10) })}
                    </Text>
                  </Flex>
                  <Heading as="h1" size="8" style={{ letterSpacing: '-0.02em' }} lang={collab.fallback ? 'ko' : undefined}>
                    {collab.title}
                  </Heading>
                  <Flex gap="2" wrap="wrap" mt="1">
                    <CopyLinkButton label={t('copyLink')} copiedLabel={t('copied')} />
                    <Tooltip content={t('reportSoon')}>
                      <Button variant="surface" color="gray" size="2" style={{ whiteSpace: 'nowrap' }} disabled>
                        <ExclamationTriangleIcon />
                        {t('report')}
                      </Button>
                    </Tooltip>
                  </Flex>
                </Flex>
              </header>

              {collab.cover && (
                <figure style={{ margin: 0 }}>
                  <img
                    src={collab.cover.url}
                    alt={collab.cover.alt}
                    width={collab.cover.width ?? undefined}
                    height={collab.cover.height ?? undefined}
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
                </div>
                <div>
                  <Text as="div" size="1" color="gray">
                    {t('end')}
                  </Text>
                  <Text as="div" size="5" weight="medium" className={collab.period.endKind === 'fixed' && start ? 'ct-mono' : undefined}>
                    {start ? end : tPeriod('unknown')}
                  </Text>
                </div>
                <div>
                  <Text as="div" size="1" color="gray">
                    {t('status')}
                  </Text>
                  <Text as="div" size="5" weight="medium" color={collab.phase === 'ongoing' ? 'grass' : undefined}>
                    {tPhase(collab.phase)}
                  </Text>
                </div>
              </section>

              <Section title={t('summary')}>
                {collab.summary ? (
                  <Text as="p" style={{ whiteSpace: 'pre-line', margin: 0 }} lang={collab.summaryFallback ? 'ko' : undefined}>
                    {collab.summary}
                  </Text>
                ) : (
                  <Text as="p" color="gray" m="0">
                    {t('summaryEmpty')}
                  </Text>
                )}
                {collab.note && (
                  <Text as="p" size="2" color="gray" mt="2">
                    {collab.note}
                  </Text>
                )}
              </Section>

              <Section title={t('classification')}>
                <dl className="ct-facts">
                  <Fact label={t('labels.category')} param="category" terms={collab.category ? [collab.category] : []} none={t('none')} />
                  <Fact label={t('labels.partner')} param="partner_category" terms={partner ? [partner.kind] : []} none={t('none')} />
                  <Fact label={t('labels.region')} param="region" terms={collab.regions} none={t('none')} />
                  <Fact label={t('labels.platform')} param="platform" terms={collab.platforms} none={t('none')} />
                  <Fact label={t('labels.type')} param="collab_type" terms={collab.collabTypes} none={t('none')} />
                </dl>
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

              {collab.related.length > 0 && (
                <Section title={t('related')}>
                  <div className="ct-two">
                    {collab.related.map((r) => (
                      <Link key={r.slug} href={`/collabs/${r.slug}`} className="ct-card-link">
                        <Text size="1" color="gray">
                          {t(`relation.${r.relation}`)}
                        </Text>
                        <Text size="3" weight="bold">
                          {r.title}
                        </Text>
                        <Text size="2" color="gray" className={r.period.start && r.period.precision !== 'unknown' ? 'ct-mono' : undefined}>
                          {formatPeriod(r.period, { unknown: tPeriod('unknown'), permanent: tPeriod('permanent'), tba: tPeriod('tba') })}
                        </Text>
                      </Link>
                    ))}
                  </div>
                </Section>
              )}
          </Flex>
        </article>
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

/** 분류 한 줄: 왼쪽 라벨, 오른쪽 값(여러 개면 배지로 나열). 값은 그 분류의 목록(랜딩 페이지)으로 연결한다 */
function Fact({ label, param, terms, none }: { label: string; param: FacetParam; terms: TermRef[]; none: string }) {
  return (
    <div>
      <dt>
        <Text size="2" color="gray">
          {label}
        </Text>
      </dt>
      <dd>
        {terms.length === 0 ? (
          <Text size="2" color="gray">
            {none}
          </Text>
        ) : (
          <Flex wrap="wrap" gap="1">
            {terms.map((term) => (
              <Badge key={term.key} asChild variant="soft" color="gray" size="2" highContrast>
                <Link href={`/${landingPath({ param, key: term.key })}`}>{term.label}</Link>
              </Badge>
            ))}
          </Flex>
        )}
      </dd>
    </div>
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
