import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LegalDocument } from '@/components/legal/LegalDocument';
import { privacyMarkdown } from '@/content/legal/privacy';
import type { Locale } from '@/i18n/routing';
import { legalContact, PRIVACY_PATH as PATH } from '@/lib/legal';
import { alternatesFor, openGraphFor } from '@/lib/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]/privacy'>): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const [t, tSite] = await Promise.all([getTranslations({ locale, namespace: 'Legal.privacy' }), getTranslations({ locale, namespace: 'Site' })]);
  return {
    title: t('title'),
    description: t('description'),
    alternates: alternatesFor(locale, PATH),
    openGraph: openGraphFor({ locale, path: PATH, siteName: tSite('name'), title: t('title'), description: t('description') }),
  };
}

export default async function PrivacyPage({ params }: PageProps<'/[locale]/privacy'>) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  return <LegalDocument kind="privacy" body={privacyMarkdown(locale, legalContact())} />;
}
