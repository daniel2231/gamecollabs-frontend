import { ArrowRightIcon } from '@radix-ui/react-icons';
import { VisuallyHidden } from '@radix-ui/themes';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { CollabCard } from '@/components/collab/CollabCard';
import { PeriodText } from '@/components/collab/PeriodText';
import { JsonLd } from '@/components/site/JsonLd';
import { SignalX } from '@/components/site/SignalX';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { listHref, parseCollabQuery } from '@/lib/filters';
import { formatDate } from '@/lib/format';
import { websiteJsonLd } from '@/lib/jsonld';
import { landingPath } from '@/lib/landing';
import { alternatesFor, defaultOgImage, openGraphFor } from '@/lib/seo';
import { siteUrl } from '@/lib/site';
import { FACET_PARAMS, type CollabQuery, type CollabSummary, type Period } from '@/schema';

/** 진행 중 목록에 보여줄 최대 개수(대표 카드 제외) */
const INDEX_SIZE = 6;
/** 일정표 한 칸의 최대 개수 */
const SCHEDULE_SIZE = 5;

export async function generateMetadata({ params }: PageProps<'/[locale]'>): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const [t, tSite] = await Promise.all([
    getTranslations({ locale, namespace: 'Home' }),
    getTranslations({ locale, namespace: 'Site' }),
  ]);
  const title = `${tSite('name')} · ${t('title')}`;
  const description = tSite('description');
  return {
    title: { absolute: title },
    description,
    alternates: alternatesFor(locale, ''),
    openGraph: openGraphFor({ locale, path: '', siteName: tSite('name'), title, description, images: [defaultOgImage(locale)] }),
  };
}

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const list = (q: Partial<CollabQuery>) => api.listCollabs({ ...parseCollabQuery({}), ...q }, locale);
  const [t, tList, tSite, terms, ongoing, upcoming, recent] = await Promise.all([
    getTranslations('Home'),
    getTranslations('List'),
    getTranslations('Site'),
    api.getTaxonomies(),
    // 곧 종료를 고르려면 진행 중 전체가 필요하다(목록 API에 종료일 정렬이 없다)
    list({ phase: 'ongoing', limit: 100 }),
    list({ phase: 'upcoming', sort: 'start_asc', limit: SCHEDULE_SIZE }),
    list({ sort: 'recent', limit: 5 }),
  ]);

  // 분류 색인: 최상위 항목마다 건수를 센다(목록 응답과 같은 태그 캐시). 빈 항목은 빼서 빈 랜딩으로 보내지 않는다
  const index = (
    await Promise.all(
      FACET_PARAMS.map(async (param) => {
        const top = terms.filter((x) => x.taxonomy === param && x.parent === null && !x.deprecated).sort((a, b) => a.order - b.order);
        const counted = await Promise.all(
          top.map(async (term) => ({
            key: term.key,
            label: term.label[locale],
            href: landingPath({ param, key: term.key }),
            count: (await list({ [param]: [term.key], limit: 1 })).total,
          })),
        );
        return { param, terms: counted.filter((x) => x.count > 0) };
      }),
    )
  ).filter((g) => g.terms.length > 0);

  // 대표 카드: 진행 중 가운데 커버가 있는 것을 먼저, 없으면 최근 등록
  const lead = ongoing.items.find((c) => c.cover) ?? ongoing.items[0] ?? recent.items[0] ?? null;
  const notLead = (c: CollabSummary) => c.slug !== lead?.slug;
  const now = ongoing.items.filter(notLead).slice(0, INDEX_SIZE);
  const ending = ongoing.items
    .filter((c) => c.period.endKind === 'fixed' && c.period.end)
    .sort((a, b) => a.period.end!.localeCompare(b.period.end!))
    .slice(0, SCHEDULE_SIZE);
  const fresh = recent.items.filter(notLead).slice(0, 4);

  const seeAll = (section: string, href: string) => (
    <Link href={href} className="ct-more" aria-label={t('seeAllLabel', { section })}>
      {t('seeAll')}
      <ArrowRightIcon aria-hidden="true" />
    </Link>
  );

  return (
    <>
      <JsonLd data={websiteJsonLd({ name: tSite('name'), description: tSite('description'), url: `${siteUrl()}/${locale}`, locale })} />
      <VisuallyHidden>
        <h1>
          {tSite('name')} · {t('title')}
        </h1>
      </VisuallyHidden>

      <div className="ct-home">
        {/* 1면: 대표 카드 | 진행 중 번호 목록 */}
        {lead && (
          <div className={now.length > 0 ? 'ct-lead' : 'ct-lead ct-lead-solo'}>
            <CollabCard collab={lead} feature />
            {now.length > 0 && (
              <Section
                id="ongoing"
                title={t('section.ongoing')}
                count={ongoing.total}
                action={seeAll(t('section.ongoing'), listHref({ phase: 'ongoing' }))}
              >
                <ol className="ct-index">
                  {now.map((c, i) => (
                    <IndexRow key={c.slug} collab={c} marker={String(i + 1).padStart(2, '0')} />
                  ))}
                </ol>
              </Section>
            )}
          </div>
        )}

        {/* 일정표: 곧 시작 | 곧 종료. 둘 다 비면 숨긴다 */}
        {(upcoming.items.length > 0 || ending.length > 0) && (
          <div className="ct-schedule">
            <Section
              id="upcoming"
              title={t('section.upcoming')}
              count={upcoming.total}
              action={upcoming.items.length > 0 && seeAll(t('section.upcoming'), listHref({ phase: 'upcoming', sort: 'start_asc' }))}
            >
              <ScheduleList items={upcoming.items} date={(c) => c.period.start} empty={t('empty.upcoming')} />
            </Section>
            <Section id="ending" title={t('section.ending')}>
              <ScheduleList items={ending} date={(c) => c.period.end} empty={t('empty.ending')} />
            </Section>
          </div>
        )}

        {fresh.length > 0 && (
          <Section id="recent" title={t('section.recent')} action={seeAll(t('section.recent'), listHref({ sort: 'recent' }))}>
            <ul className="ct-grid">
              {fresh.map((c) => (
                <li key={c.slug}>
                  <CollabCard collab={c} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {index.length > 0 && (
          <Section id="index" title={t('section.index')}>
            <dl className="ct-facet-index">
              {index.map((group) => (
                <div key={group.param}>
                  <dt>{tList(`facet.${group.param}`)}</dt>
                  <dd>
                    <ul>
                      {group.terms.map((term) => (
                        <li key={term.key}>
                          <Link href={term.href}>{term.label}</Link> <span className="ct-mono">{term.count}</span>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        )}
      </div>
    </>
  );
}

function Section({ id, title, count, action, children }: { id: string; title: string; count?: number; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`home-${id}`} className="ct-home-section">
      <div className="ct-section-heading">
        <h2 id={`home-${id}`}>
          {title}
          {count !== undefined && <span className="ct-month-count">{count}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** 일정표의 날짜: 일 단위면 올해 표기 없이 10.17, 월 단위면 2026.10 */
function shortDate(date: string | null, precision: Period['precision']): string {
  const full = formatDate(date, precision);
  if (!full) return '—';
  return precision === 'day' ? full.slice(5) : full;
}

/** 글자만 있는 한 줄: 왼쪽 표시(번호나 날짜), 오른쪽 제목과 참여 작품 분류 */
function IndexRow({ collab, marker, period = true }: { collab: CollabSummary; marker: string; period?: boolean }) {
  const host = collab.parties.find((p) => p.role === 'host');
  const partner = collab.parties.find((p) => p.role === 'partner');
  const kinds = [host?.kind.label, partner?.kind.label].filter(Boolean).join(' × ');
  return (
    <li>
      <Link href={`/collabs/${collab.slug}`} className="ct-index-row">
        <span className="ct-index-marker ct-mono">{marker}</span>
        <span className="ct-index-body">
          <span className="ct-index-title">
            <SignalX text={collab.title} />
          </span>
          <span className="ct-index-meta">
            {kinds && (
              <span>
                <SignalX text={kinds} />
              </span>
            )}
            {period && <PeriodText period={collab.period} />}
          </span>
        </span>
      </Link>
    </li>
  );
}

function ScheduleList({ items, date, empty }: { items: CollabSummary[]; date: (c: CollabSummary) => string | null; empty: string }) {
  if (items.length === 0) return <p className="ct-index-empty">{empty}</p>;
  return (
    <ol className="ct-index">
      {items.map((c) => (
        <IndexRow key={c.slug} collab={c} marker={shortDate(date(c), c.period.precision)} period={false} />
      ))}
    </ol>
  );
}
