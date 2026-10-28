import '../globals.css';
import { Theme } from '@radix-ui/themes';
import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Analytics } from '@/components/site/Analytics';
import { routing } from '@/i18n/routing';
import { siteVerification } from '@/lib/seo';
import { siteUrl } from '@/lib/site';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: 'Site' });
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t('name'), template: `%s · ${t('name')}` },
    description: t('description'),
    // canonical·hreflang은 각 페이지가 정한다. 여기에 두면 404·에러 페이지가 홈을 canonical로 물려받는다
    alternates: { types: { 'application/rss+xml': `/${locale}/rss.xml` } },
    openGraph: { siteName: t('name'), locale: locale === 'ko' ? 'ko_KR' : 'en_US', type: 'website' },
    twitter: { card: 'summary_large_image' },
    verification: siteVerification(),
  };
}

export const viewport: Viewport = { themeColor: '#0a0a09', colorScheme: 'dark' };

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`dark ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider>
          <Theme appearance="dark" accentColor="gray" grayColor="sand" radius="none" panelBackground="solid">
            {children}
          </Theme>
        </NextIntlClientProvider>
      </body>
      <Analytics />
    </html>
  );
}
