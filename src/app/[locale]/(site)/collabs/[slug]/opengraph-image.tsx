import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { formatPeriod } from '@/lib/format';
import { loadOgFont } from '@/lib/og-font';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Collab Tracker';

export default async function OgImage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const collab = await api.getCollab(slug, locale as Locale);
  const [tSite, tPeriod] = await Promise.all([
    getTranslations({ locale: locale as Locale, namespace: 'Site' }),
    getTranslations({ locale: locale as Locale, namespace: 'Period' }),
  ]);
  const title = collab?.title ?? tSite('name');
  const period = collab ? formatPeriod(collab.period, { unknown: tPeriod('unknown'), permanent: tPeriod('permanent'), tba: tPeriod('tba') }) : '';
  const parties = collab?.parties.map((p) => p.name.value).join(' × ') ?? '';
  const text = `${title}${period}${parties}${tSite('name')}×`;
  const font = await loadOgFont(text);

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: '#0b0b0d', color: '#ededef', fontFamily: 'Noto Sans KR' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: '#3e63dd', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>×</div>
          {tSite('name')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 72, lineHeight: 1.15, letterSpacing: -2 }}>{title}</div>
          <div style={{ fontSize: 32, color: '#a1a4ab' }}>{period}</div>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: 'Noto Sans KR', data: font, weight: 700, style: 'normal' }] : undefined },
  );
}
