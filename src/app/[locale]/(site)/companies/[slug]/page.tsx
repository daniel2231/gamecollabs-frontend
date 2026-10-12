import { Badge, Card, Flex, Heading, Text } from '@radix-ui/themes';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CountList, StatGrid } from '@/components/entity/EntityParts';
import { EntityTimeline } from '@/components/entity/EntityTimeline';
import { Breadcrumb } from '@/components/site/Breadcrumb';
import { JsonLd } from '@/components/site/JsonLd';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { formatMonth, originalName } from '@/lib/format';
import { breadcrumbJsonLd, companyJsonLd } from '@/lib/jsonld';
import { alternatesFor, openGraphFor } from '@/lib/seo';
import { siteUrl } from '@/lib/site';

type Props = PageProps<'/[locale]/companies/[slug]'>;

export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  const c = await api.getCompany(slug, locale);
  if (!c) return {};
  const [t, tSite] = await Promise.all([
    getTranslations({ locale, namespace: 'Company' }),
    getTranslations({ locale, namespace: 'Site' }),
  ]);
  const description = t('metaDescription', { name: c.name.value, count: c.stats.collabCount });
  const path = `/companies/${slug}`;
  return {
    title: c.name.value,
    description,
    alternates: alternatesFor(locale, path),
    openGraph: openGraphFor({ locale, path, siteName: tSite('name'), title: c.name.value, description }),
  };
}

export default async function CompanyPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const c = await api.getCompany(slug, locale);
  if (!c) notFound();
  const [t, tp, tRole] = await Promise.all([getTranslations('Company'), getTranslations('Property'), getTranslations('Role')]);
  const regionName = c.country ? new Intl.DisplayNames([locale], { type: 'region' }).of(c.country) : null;

  const base = siteUrl();
  const url = `${base}/${locale}/companies/${c.slug}`;
  const jsonLd = [
    companyJsonLd(c, { url }),
    breadcrumbJsonLd([{ name: (await getTranslations('Site.nav'))('collabs'), url: `${base}/${locale}` }, { name: c.name.value }]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <Flex wrap="wrap" gap="6" align="end" justify="between" pb="6" mb="6" style={{ borderBottom: '1px solid var(--ct-line)' }}>
        <Flex direction="column" gap="2" style={{ minWidth: 0 }}>
          <Breadcrumb label={t('breadcrumb')} items={[{ label: t('breadcrumb') }, { label: c.name.value }]} />
          <Heading as="h1" size="9" style={{ letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            {c.name.value}
          </Heading>
          <Flex wrap="wrap" gap="3">
            {[originalName(c), regionName].filter(Boolean).map((n, i) => (
              <Text key={i} color="gray" size="3">
                {i > 0 && <span aria-hidden="true">· </span>}
                {n}
              </Text>
            ))}
          </Flex>
          {c.aliases.length > 0 && (
            <Flex wrap="wrap" align="center" gap="2" mt="1">
              <Text size="1" color="gray" mr="1">
                {tp('aliases')}
              </Text>
              {c.aliases.map((a) => (
                <Badge key={a} color="gray" variant="soft">
                  {a}
                </Badge>
              ))}
            </Flex>
          )}
        </Flex>
        <StatGrid
          stats={[
            { label: t('stats.collabs'), value: String(c.stats.collabCount) },
            { label: t('stats.properties'), value: String(c.properties.length) },
            { label: t('stats.latest'), value: formatMonth(c.stats.latestStart) ?? '—' },
          ]}
        />
      </Flex>

      <div className="ct-split">
        <EntityTimeline items={c.collabs.map((x) => ({ ...x, heading: x.title, extra: tRole(x.companyRole) }))} />
        <aside className="ct-side">
          <Flex direction="column" gap="4">
            <CountList title={t('properties')} items={c.properties} hrefPrefix="/properties" />
            <Card size="2">
              <Heading as="h2" size="3" mb="3">
                {t('roles')}
              </Heading>
              <Flex wrap="wrap" gap="2">
                {c.roles.map((r) => (
                  <Badge key={r.role} variant="soft" size="2">
                    {tRole(r.role)} <span className="ct-mono">{r.count}</span>
                  </Badge>
                ))}
              </Flex>
            </Card>
          </Flex>
        </aside>
      </div>
    </>
  );
}
