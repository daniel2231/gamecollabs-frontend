import { ArrowRightIcon } from '@radix-ui/react-icons';
import { VisuallyHidden } from '@radix-ui/themes';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { CollabCard } from '@/components/collab/CollabCard';
import { LeadCarousel } from '@/components/collab/LeadCarousel';
import { PeriodText } from '@/components/collab/PeriodText';
import { PhaseBadge } from '@/components/collab/PhaseBadge';
import { CoverImage } from '@/components/site/CoverImage';
import { JsonLd } from '@/components/site/JsonLd';
import { SignalX } from '@/components/site/SignalX';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { LIST_PATH, listHref, parseCollabQuery } from '@/lib/filters';
import { formatDate } from '@/lib/format';
import { websiteJsonLd } from '@/lib/jsonld';
import { LANDING_PHASES } from '@/lib/landing';
import { alternatesFor, defaultOgImage, openGraphFor } from '@/lib/seo';
import { siteUrl } from '@/lib/site';
import type { CollabQuery, CollabSummary, FeaturedProperty, Period } from '@/schema';

/** 대표 캐러셀의 최대 슬라이드 수 */
const LEAD_SIZE = 5;
/** 진행 중 목록에 보여줄 최대 개수(대표 카드 제외) */
const INDEX_SIZE = 6;
/** 일정표 한 칸의 최대 개수 */
const SCHEDULE_SIZE = 5;
/** IP로 찾아보기 최대 개수 */
const FEATURED_SIZE = 12;

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
  const [t, tPhase, tSite, stats, featured, ongoing, upcoming, recent] = await Promise.all([
    getTranslations('Home'),
    getTranslations('Phase'),
    getTranslations('Site'),
    api.getStats(),
    api.listFeaturedProperties(locale),
    // 곧 종료를 고르려면 진행 중 전체가 필요하다(목록 API에 종료일 정렬이 없다)
    list({ phase: 'ongoing', limit: 100 }),
    list({ phase: 'upcoming', sort: 'start_asc', limit: SCHEDULE_SIZE }),
    // 진행 중이 모자랄 때 대표 캐러셀을 채운다
    list({ sort: 'recent', limit: LEAD_SIZE }),
  ]);

  // 대표 캐러셀: 진행 중(커버 있는 것 먼저), 모자라면 최근 등록(역시 커버 있는 것 먼저)으로 채운다
  const coverFirst = (items: CollabSummary[]) => [...items.filter((c) => c.cover), ...items.filter((c) => !c.cover)];
  // Map은 처음 넣은 순서를 지키므로 겹치는 콜라보는 앞자리 하나만 남는다
  const pool = new Map([...coverFirst(ongoing.items), ...coverFirst(recent.items)].map((c) => [c.slug, c]));
  const leads = [...pool.values()].slice(0, LEAD_SIZE);
  const leadSlugs = new Set(leads.map((c) => c.slug));
  const now = ongoing.items.filter((c) => !leadSlugs.has(c.slug)).slice(0, INDEX_SIZE);
  const ending = ongoing.items
    .filter((c) => c.period.endKind === 'fixed' && c.period.end)
    .sort((a, b) => a.period.end!.localeCompare(b.period.end!))
    .slice(0, SCHEDULE_SIZE);
  // 운영자가 고른 작품 가운데 발행된 콜라보가 있는 것만
  const ips = featured.filter((p) => p.collabCount > 0).slice(0, FEATURED_SIZE);

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
        {/* 현황: 얇은 한 줄. 등록된 콜라보 전체 수와 진행 상태별 수, 각각 목록으로 이어진다 */}
        <nav aria-label={t('tally')}>
          <ul className="ct-tally">
            <li>
              <Link href={LIST_PATH}>
                <span className="ct-tally-label">{t('total')}</span>
                <span className="ct-tally-num ct-mono">{stats.published}</span>
              </Link>
            </li>
            {LANDING_PHASES.map((phase) => (
              <li key={phase}>
                <Link href={listHref({ phase })} data-phase={phase}>
                  <span className="ct-tally-label">{tPhase(phase)}</span>
                  <span className="ct-tally-num ct-mono">{stats.byPhase[phase] ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* 1면: 대표 카드 캐러셀 | 진행 중 번호 목록 */}
        {leads.length > 0 && (
          <div className={now.length > 0 ? 'ct-lead' : 'ct-lead ct-lead-solo'}>
            <LeadCarousel
              label={t('carousel.label')}
              prevLabel={t('carousel.prev')}
              nextLabel={t('carousel.next')}
              slideLabels={leads.map((_, i) => t('carousel.slide', { index: i + 1, total: leads.length }))}
              slides={leads.map((c, i) => (
                <CollabCard key={c.slug} collab={c} feature eager={i === 0} />
              ))}
            />
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

        {/* IP로 찾아보기: 운영자가 관리자 화면에서 고른 작품. 작품 페이지로 이어진다 */}
        {ips.length > 0 && (
          <Section id="ips" title={t('section.ips')}>
            <ul className="ct-ip-grid">
              {ips.map((p) => (
                <li key={p.slug}>
                  <IpTile property={p} collabs={t('ipCollabs', { count: p.collabCount })} />
                </li>
              ))}
            </ul>
          </Section>
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
      </div>
    </>
  );
}

/** IP 타일: 대표 이미지 → 최근 콜라보 커버 → 이름만(격자 바탕) 순으로 그림을 고른다 */
function IpTile({ property: p, collabs }: { property: FeaturedProperty; collabs: string }) {
  const cover = p.image ?? p.latestCover;
  return (
    <Link href={`/properties/${p.slug}`} className="ct-ip">
      <div className="ct-ip-cover">
        {cover ? (
          <CoverImage src={cover.url} width={cover.width} height={cover.height} sizes="(max-width: 600px) 50vw, 240px" />
        ) : (
          <div className="ct-ip-mono" aria-hidden="true">
            {p.name.value}
          </div>
        )}
        {p.ongoingCount > 0 && (
          <span className="ct-card-phase">
            <PhaseBadge phase="ongoing" />
          </span>
        )}
      </div>
      <span className="ct-ip-name">{p.name.value}</span>
      <span className="ct-ip-meta">
        {p.kind.label} · <span className="ct-mono">{collabs}</span>
      </span>
    </Link>
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
