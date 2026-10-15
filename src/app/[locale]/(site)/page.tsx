import { ArrowRightIcon } from '@radix-ui/react-icons';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense, type ReactNode } from 'react';
import { CollabCard } from '@/components/collab/CollabCard';
import { JsonLd } from '@/components/site/JsonLd';
import { LogoMark } from '@/components/site/LogoMark';
import { SearchBox } from '@/components/site/SearchBox';
import { SignalX } from '@/components/site/SignalX';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { LIST_PATH, listHref, parseCollabQuery } from '@/lib/filters';
import { websiteJsonLd } from '@/lib/jsonld';
import { LANDING_PHASES, landingPath } from '@/lib/landing';
import { alternatesFor, defaultOgImage, openGraphFor } from '@/lib/seo';
import { siteUrl } from '@/lib/site';
import type { CollabQuery, CollabSummary, FacetParam } from '@/schema';

/** 첫 화면 분류 바로가기에 쓰는 분류. 최상위 항목만, 결과가 있는 것만 보여준다 */
const BROWSE_FACETS = ['partner_category', 'category'] as const satisfies readonly FacetParam[];

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
  const [t, tPhase, tSite, stats, terms, ongoing, upcoming, recent] = await Promise.all([
    getTranslations('Home'),
    getTranslations('Phase'),
    getTranslations('Site'),
    api.getStats(),
    api.getTaxonomies(),
    list({ phase: 'ongoing', limit: 5 }),
    list({ phase: 'upcoming', sort: 'start_asc', limit: 5 }),
    list({ sort: 'recent', limit: 5 }),
  ]);

  // 최상위 분류 항목마다 건수를 센다(목록 응답과 같은 태그 캐시를 쓴다). 빈 항목은 빼서 빈 랜딩으로 보내지 않는다
  const browse = await Promise.all(
    BROWSE_FACETS.map(async (param) => {
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
  );
  const chips = browse.flatMap((g) => g.terms);

  // 첫 화면의 큰 카드: 진행 중 가운데 커버가 있는 것을 먼저, 없으면 최근 등록
  const spotlight = ongoing.items.find((c) => c.cover) ?? ongoing.items[0] ?? recent.items[0] ?? null;
  const rest = (items: CollabSummary[]) => items.filter((c) => c.slug !== spotlight?.slug).slice(0, 4);

  return (
    <>
      <JsonLd data={websiteJsonLd({ name: tSite('name'), description: tSite('description'), url: `${siteUrl()}/${locale}`, locale })} />

      {/* 첫 화면: 질문형 제목, 큰 검색, 분류 바로가기, 진행 상태 숫자. 오른쪽에 큰 엠블럼 */}
      <section className="ct-front" aria-labelledby="home-title">
        <div className="ct-front-text">
          <p className="ct-front-eyebrow ct-mono">
            <SignalX text={t('title')} />
          </p>
          <h1 id="home-title">{t.rich('tagline', { br: () => <br /> })}</h1>

          <div className="ct-front-search">
            <Suspense fallback={null}>
              <SearchBox id="home-search" />
            </Suspense>
          </div>

          {chips.length > 0 && (
            <nav aria-label={t('quick')}>
              <ul className="ct-chips">
                {chips.map((term) => (
                  <li key={term.key}>
                    <Link href={term.href}>
                      {term.label}
                      <sup className="ct-mono">{term.count}</sup>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="ct-front-foot">
            <nav aria-label={t('stats')}>
              <ul className="ct-front-stats">
                {LANDING_PHASES.map((phase) => (
                  <li key={phase}>
                    <Link href={listHref({ phase })} data-phase={phase}>
                      <span className="ct-mono">{stats.byPhase[phase] ?? 0}</span> {tPhase(phase)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <Link href={LIST_PATH} className="ct-more ct-more-lg">
              {t('browseAll')}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="ct-front-emblem" aria-hidden="true">
          <LogoMark size={300} />
        </div>
      </section>

      <div className="ct-home">
        {spotlight && (
          <Section id="spotlight" title={t('spotlight')}>
            <CollabCard collab={spotlight} feature />
          </Section>
        )}
        <CardSection id="ongoing" title={t('section.ongoing')} href={listHref({ phase: 'ongoing' })} items={rest(ongoing.items)} seeAll={t('seeAll')} seeAllLabel={t('seeAllLabel', { section: t('section.ongoing') })} />
        <CardSection id="upcoming" title={t('section.upcoming')} href={listHref({ phase: 'upcoming', sort: 'start_asc' })} items={rest(upcoming.items)} seeAll={t('seeAll')} seeAllLabel={t('seeAllLabel', { section: t('section.upcoming') })} />
        <CardSection id="recent" title={t('section.recent')} href={listHref({ sort: 'recent' })} items={rest(recent.items)} seeAll={t('seeAll')} seeAllLabel={t('seeAllLabel', { section: t('section.recent') })} />
      </div>
    </>
  );
}

function Section({ id, title, action, children }: { id: string; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`home-${id}`} className="ct-home-section">
      <div className="ct-section-heading">
        <h2 id={`home-${id}`}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** 카드 묶음 하나. 비어 있으면 섹션째 숨긴다 */
function CardSection({
  id,
  title,
  href,
  items,
  seeAll,
  seeAllLabel,
}: {
  id: string;
  title: string;
  href: string;
  items: CollabSummary[];
  seeAll: string;
  seeAllLabel: string;
}) {
  if (items.length === 0) return null;
  return (
    <Section
      id={id}
      title={title}
      action={
        <Link href={href} className="ct-more" aria-label={seeAllLabel}>
          {seeAll}
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      }
    >
      <ul className="ct-grid">
        {items.map((item) => (
          <li key={item.slug}>
            <CollabCard collab={item} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
