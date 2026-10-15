import { ArrowRightIcon } from '@radix-ui/react-icons';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { CollabCard } from '@/components/collab/CollabCard';
import { JsonLd } from '@/components/site/JsonLd';
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

/** 분류별 둘러보기에 쓰는 분류. 최상위 항목만, 결과가 있는 것만 보여준다 */
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
  const [t, tPhase, tList, tSite, stats, terms, ongoing, upcoming, recent] = await Promise.all([
    getTranslations('Home'),
    getTranslations('Phase'),
    getTranslations('List'),
    getTranslations('Site'),
    api.getStats(),
    api.getTaxonomies(),
    list({ phase: 'ongoing', limit: 8 }),
    list({ phase: 'upcoming', sort: 'start_asc', limit: 4 }),
    list({ sort: 'recent', limit: 4 }),
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
  const browseGroups = browse.filter((g) => g.terms.length > 0);

  return (
    <>
      <JsonLd data={websiteJsonLd({ name: tSite('name'), description: tSite('description'), url: `${siteUrl()}/${locale}`, locale })} />

      <header className="ct-hero">
        <h1>
          <SignalX text={t('title')} />
        </h1>
        <Link href={LIST_PATH} className="ct-more ct-more-lg">
          {t('browseAll')}
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      </header>

      <nav aria-label={t('stats')}>
        <ul className="ct-stats">
          {LANDING_PHASES.map((phase) => (
            <li key={phase}>
              <Link href={listHref({ phase })} data-phase={phase}>
                <span className="ct-stats-num ct-mono">{stats.byPhase[phase] ?? 0}</span>
                <span className="ct-stats-label">{tPhase(phase)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="ct-home">
        <CardSection id="ongoing" title={t('section.ongoing')} href={listHref({ phase: 'ongoing' })} items={ongoing.items} seeAll={t('seeAll')} seeAllLabel={t('seeAllLabel', { section: t('section.ongoing') })} />
        <CardSection id="upcoming" title={t('section.upcoming')} href={listHref({ phase: 'upcoming', sort: 'start_asc' })} items={upcoming.items} seeAll={t('seeAll')} seeAllLabel={t('seeAllLabel', { section: t('section.upcoming') })} />
        <CardSection id="recent" title={t('section.recent')} href={listHref({ sort: 'recent' })} items={recent.items} seeAll={t('seeAll')} seeAllLabel={t('seeAllLabel', { section: t('section.recent') })} />

        {browseGroups.length > 0 && (
          <Section id="browse" title={t('section.browse')}>
            <div className="ct-browse">
              {browseGroups.map((group) => (
                <section key={group.param} aria-labelledby={`browse-${group.param}`}>
                  <h3 id={`browse-${group.param}`} className="ct-browse-heading">
                    {tList(`facet.${group.param}`)}
                  </h3>
                  <ul className="ct-chips">
                    {group.terms.map((term) => (
                      <li key={term.key}>
                        <Link href={term.href}>
                          {term.label}
                          <sup className="ct-mono">{term.count}</sup>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </Section>
        )}
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
