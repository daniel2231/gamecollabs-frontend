import { Badge, Flex, Heading, Link as RadixLink, Text } from '@radix-ui/themes';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PhaseBadge } from '@/components/collab/PhaseBadge';
import { BookmarkButton } from '@/components/member/BookmarkButton';
import { ReportDialog } from '@/components/report/ReportDialog';
import { Breadcrumb } from '@/components/site/Breadcrumb';
import { CopyLinkButton } from '@/components/site/CopyLinkButton';
import { CoverImage } from '@/components/site/CoverImage';
import { JsonLd } from '@/components/site/JsonLd';
import { SignalX } from '@/components/site/SignalX';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { formatDate, formatPeriod, formatPeriodEnd, periodLabels } from '@/lib/format';
import { breadcrumbJsonLd, collabJsonLd } from '@/lib/jsonld';
import { LIST_PATH } from '@/lib/filters';
import { landingPath } from '@/lib/landing';
import { alternatesFor, clampDescription, collabSearchTitle, openGraphFor } from '@/lib/seo';
import { siteUrl } from '@/lib/site';
import type { CollabDetail, FacetParam, TermRef } from '@/schema';

type Props = PageProps<'/[locale]/collabs/[slug]'>;

// 웹훅(collab:/property:/company: 태그)이 갱신을 맡는다. 시간 재검증은 하루 한 번의 안전망
export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  const collab = await api.getCollab(slug, locale);
  if (!collab) return {};
  const [t, tDetail, tPeriod, tPhase] = await Promise.all([
    getTranslations({ locale, namespace: 'Site' }),
    getTranslations({ locale, namespace: 'Detail.meta' }),
    getTranslations({ locale, namespace: 'Period' }),
    getTranslations({ locale, namespace: 'Phase' }),
  ]);
  const known = collab.period.precision !== 'unknown' ? collab.period.start : null;
  // '[게임] × [IP] 콜라보' 검색에 걸리도록 콜라보 표기와 시작 연도를 붙인다(같은 두 작품의 콜라보를 연도로 구별)
  const title = collabSearchTitle(collab.title, known, {
    plain: (title) => tDetail('title', { title }),
    withYear: (title, year) => tDetail('titleYear', { title, year }),
  });
  // 상태·기간을 앞에 두어 검색 결과에서 바로 보이게 하고, 요약이 없으면 페이지에 무엇이 있는지 적는다
  const phase = collab.phase === 'ended' && collab.period.endKind === 'conditional' ? tPeriod('endedEstimated') : tPhase(collab.phase);
  const lead = known ? `${phase} · ${formatPeriod(collab.period, periodLabels(tPeriod))}` : phase;
  const description = clampDescription(`${lead}. ${collab.summary || tDetail('descriptionFallback')}`);
  const path = `/collabs/${slug}`;
  const alternates = alternatesFor(locale, path);
  return {
    title,
    description,
    // AI 도구용 마크다운 사본(<link rel="alternate" type="text/markdown">)
    alternates: { ...alternates, types: { ...alternates.types, 'text/markdown': `/${locale}${path}.md` } },
    openGraph: openGraphFor({
      locale,
      path,
      siteName: t('name'),
      type: 'article',
      title,
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
  const labels = periodLabels(tPeriod);
  const start = formatDate(collab.period.start, collab.period.precision);
  const end = formatPeriodEnd(collab.period, labels);
  // 조건부 종료가 끝난 것으로 보이는 건 발표된 날짜가 아니라 추정이다
  const estimatedEnd = collab.phase === 'ended' && collab.period.endKind === 'conditional';
  // 값이 없는 분류는 '—' 줄을 늘어놓지 않고 뺀다
  const facts = (
    [
      { label: t('labels.category'), param: 'category', terms: collab.category ? [collab.category] : [] },
      { label: t('labels.partner'), param: 'partner_category', terms: partner ? [partner.kind] : [] },
      { label: t('labels.region'), param: 'region', terms: collab.regions },
      { label: t('labels.platform'), param: 'platform', terms: collab.platforms },
      { label: t('labels.type'), param: 'collab_type', terms: collab.collabTypes },
    ] satisfies { label: string; param: FacetParam; terms: TermRef[] }[]
  ).filter((f) => f.terms.length > 0);
  const navLabel = (await getTranslations('Site.nav'))('collabs');
  const base = siteUrl();
  const url = `${base}/${locale}/collabs/${slug}`;
  const jsonLd = [
    collabJsonLd(collab, { url, locale }),
    breadcrumbJsonLd([{ name: navLabel, url: `${base}/${locale}${LIST_PATH}` }, { name: collab.title }]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      {/* 가운데 한 열: 머리 → 핵심 정보 → 내용 → 출처 → 다음에 볼 것 */}
      <div className="ct-article">
        <Breadcrumb label={t('breadcrumb')} items={[{ href: LIST_PATH, label: navLabel }, { label: collab.title }]} />
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
                  <Heading as="h1" size="9" weight="bold" style={{ letterSpacing: '-0.04em', lineHeight: 1.05 }} lang={collab.fallback ? 'ko' : undefined}>
                    <SignalX text={collab.title} />
                  </Heading>
                  <Flex gap="2" wrap="wrap" mt="1">
                    <BookmarkButton slug={collab.slug} />
                    <CopyLinkButton label={t('copyLink')} copiedLabel={t('copied')} failedLabel={t('copyFailed')} />
                    <ReportDialog collab={collab.slug} title={collab.title} />
                  </Flex>
                </Flex>
              </header>

              {collab.cover && (
                <figure style={{ margin: 0 }}>
                  <CoverImage
                    src={collab.cover.url}
                    alt={collab.cover.alt}
                    width={collab.cover.width}
                    height={collab.cover.height}
                    sizes="(max-width: 960px) 100vw, 800px"
                    eager
                    style={{ width: '100%', height: 'auto', border: '1px solid var(--ct-line)' }}
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

              {/* 시작·종료·상태는 정의 목록으로 둔다. 날짜는 <time>에 기계가 읽는 값을 함께 넣는다 */}
              <dl className="ct-stat-grid" aria-label={t('status')}>
                <div>
                  <Text size="1" color="gray" asChild>
                    <dt>{t('start')}</dt>
                  </Text>
                  <Text size="5" weight="medium" className={start ? 'ct-mono' : undefined} asChild>
                    <dd>{start && collab.period.start ? <time dateTime={machineDate(collab.period.start, collab.period.precision)}>{start}</time> : tPeriod('unknown')}</dd>
                  </Text>
                </div>
                <div>
                  <Text size="1" color="gray" asChild>
                    <dt>{t('end')}</dt>
                  </Text>
                  <Text size="5" weight="medium" className={collab.period.endKind === 'fixed' && start ? 'ct-mono' : undefined} asChild>
                    <dd>
                      {start && collab.period.endKind === 'fixed' && collab.period.end ? (
                        <time dateTime={machineDate(collab.period.end, collab.period.precision)}>{end}</time>
                      ) : start ? (
                        end
                      ) : (
                        tPeriod('unknown')
                      )}
                    </dd>
                  </Text>
                </div>
                <div>
                  <Text size="1" color="gray" asChild>
                    <dt>{t('status')}</dt>
                  </Text>
                  <Text
                    size="5"
                    weight="medium"
                    style={collab.phase === 'ongoing' ? { color: 'var(--ct-signal)' } : undefined}
                    title={estimatedEnd ? tPeriod('estimatedHint') : undefined}
                    asChild
                  >
                    <dd>{estimatedEnd ? tPeriod('endedEstimated') : tPhase(collab.phase)}</dd>
                  </Text>
                </div>
              </dl>

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

              {collab.venues.length > 0 && (
                <Section title={t('venues')}>
                  <div className="ct-rows">
                    {collab.venues.map((v, i) => (
                      <Flex
                        key={`${v.name}-${i}`}
                        direction="column"
                        gap="1"
                        py="3"
                        style={i ? { borderTop: '1px solid var(--ct-line-soft)' } : undefined}
                      >
                        {v.url ? (
                          <RadixLink href={v.url} target="_blank" rel="noopener noreferrer" weight="medium" highContrast underline="hover">
                            {v.name} ↗
                          </RadixLink>
                        ) : (
                          <Text weight="medium">{v.name}</Text>
                        )}
                        {/* 주소는 공식 표기(현지어) 그대로 둔다 */}
                        {v.address && (
                          <Text size="2" color="gray" translate="no">
                            {v.address}
                          </Text>
                        )}
                      </Flex>
                    ))}
                  </div>
                </Section>
              )}

              {facts.length > 0 && (
                <Section title={t('classification')}>
                  <dl className="ct-facts">
                    {facts.map((f) => (
                      <Fact key={f.param} {...f} />
                    ))}
                  </dl>
                </Section>
              )}

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
                  <div className="ct-rows">
                    {collab.companies.map((c, i) => (
                      <Flex
                        key={`${c.slug}-${c.role}`}
                        wrap="wrap"
                        justify="between"
                        gap="2"
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
                  </div>
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
                          <SignalX text={r.title} />
                        </Text>
                        <Text size="2" color="gray" className={r.period.start && r.period.precision !== 'unknown' ? 'ct-mono' : undefined}>
                          {formatPeriod(r.period, labels)}
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

/** <time dateTime>: 월 정밀도면 YYYY-MM(일까지 적으면 발표되지 않은 날짜를 단정하게 된다) */
function machineDate(date: string, precision: CollabDetail['period']['precision']): string {
  return precision === 'month' ? date.slice(0, 7) : date.slice(0, 10);
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
function Fact({ label, param, terms }: { label: string; param: FacetParam; terms: TermRef[] }) {
  return (
    <div>
      <dt>
        <Text size="2" color="gray">
          {label}
        </Text>
      </dt>
      <dd>
        <Flex wrap="wrap" gap="1">
          {terms.map((term) => (
            <Badge key={term.key} asChild variant="soft" color="gray" size="2" highContrast>
              <Link href={landingPath({ param, key: term.key })}>{term.label}</Link>
            </Badge>
          ))}
        </Flex>
      </dd>
    </div>
  );
}

/**
 * 출처 목록: 줄마다 왼쪽 제목·발행처, 오른쪽 유형·확인일. 표 대신 줄로 두어
 * 좁은 화면에서는 오른쪽 묶음이 제목 아래로 내려간다
 */
async function Sources({ collab }: { collab: CollabDetail }) {
  const t = await getTranslations('Detail');
  return (
    <ul className="ct-rows ct-sources">
      {collab.sources.map((s) => (
        <li key={s.url}>
          <div className="ct-source-main">
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
          </div>
          <div className="ct-source-meta">
            <Badge variant="soft" color="gray" highContrast={s.type === 'official'}>
              {t(`sourceType.${s.type}`)}
            </Badge>
            <Text size="1" color="gray">
              {t('sourceColumns.accessed')} <time className="ct-mono" dateTime={s.accessedAt}>{s.accessedAt}</time>
            </Text>
          </div>
        </li>
      ))}
    </ul>
  );
}
