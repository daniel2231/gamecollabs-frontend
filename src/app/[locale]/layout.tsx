import '../globals.css';
import { Theme } from '@radix-ui/themes';
import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans_KR } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { siteUrl } from '@/lib/site';

const plexSans = IBM_Plex_Sans_KR({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-plex-sans',
  display: 'swap',
});
const plexMono = IBM_Plex_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: hasLocale(routing.locales, locale) ? locale : 'ko', namespace: 'Site' });
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t('name'), template: `%s · ${t('name')}` },
    description: t('description'),
    alternates: {
      canonical: `/${locale}`,
      languages: { ko: '/ko', en: '/en' },
      types: { 'application/rss+xml': `/${locale}/rss.xml` },
    },
    openGraph: { siteName: t('name'), locale: locale === 'ko' ? 'ko_KR' : 'en_US', type: 'website' },
  };
}

export const viewport: Viewport = { themeColor: '#0b0b0d', colorScheme: 'dark' };

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`dark ${plexSans.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider>
          <Theme appearance="dark" accentColor="indigo" grayColor="slate" radius="medium" panelBackground="solid">
            {children}
          </Theme>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
