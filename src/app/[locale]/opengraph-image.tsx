import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import { LOGO_MARKS, LOGO_TRACES, LOGO_VIEWBOX } from '@/components/site/LogoMark';
import { loadOgFont } from '@/lib/og-font';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Collab Tracker';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** 자체 OG 이미지가 없는 페이지(목록·작품·회사)가 쓰는 기본 이미지 */
export default async function OgImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Site' });
  const name = t('name');
  const description = t('description');
  const font = await loadOgFont(`${name}${description}×`);

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: '#0b0b0d', color: '#ededef', fontFamily: 'Noto Sans KR' }}>
        <svg width={136} height={120} viewBox={LOGO_VIEWBOX} fill="none" stroke="#ededef" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round">
          {[...LOGO_TRACES, ...LOGO_MARKS].map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 88, lineHeight: 1.1, letterSpacing: -2 }}>{name}</div>
          <div style={{ fontSize: 34, lineHeight: 1.4, color: '#a1a4ab', wordBreak: 'keep-all' }}>{description}</div>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: 'Noto Sans KR', data: font, weight: 700, style: 'normal' }] : undefined },
  );
}
