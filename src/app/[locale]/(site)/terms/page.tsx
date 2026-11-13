import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LegalDocument } from '@/components/legal/LegalDocument';
import { termsMarkdown } from '@/content/legal/terms';
import type { Locale } from '@/i18n/routing';
import { legalContact, TERMS_PATH as PATH } from '@/lib/legal';
import { alternatesFor, openGraphFor } from '@/lib/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]/terms'>): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const [t, tSite] = await Promise.all([getTranslations({ locale, namespace: 'Legal.terms' }), getTranslations({ locale, namespace: 'Site' })]);
  return {
    title: t('title'),
    description: t('description'),
    alternates: alternatesFor(locale, PATH),
    openGraph: openGraphFor({ locale, path: PATH, siteName: tSite('name'), title: t('title'), description: t('description') }),
  };
}

export default async function TermsPage({ params }: PageProps<'/[locale]/terms'>) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  return <LegalDocument kind="terms" body={termsMarkdown(locale, legalContact())} />;
}
