import { ImageResponse } from 'next/og';
import { loadOgFont } from '@/lib/og-font';

export const OG_SIZE = { width: 1200, height: 630 };

/** 상세 페이지 공유 이미지: 왼쪽 위 로고·사이트 이름, 아래 제목과 한 줄 설명 */
export async function ogCard({ siteName, title, subtitle }: { siteName: string; title: string; subtitle: string }) {
  const font = await loadOgFont(`${title}${subtitle}${siteName}×`);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: '#0b0b0d', color: '#ededef', fontFamily: 'Noto Sans KR' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: '#edeef0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111113' }}>×</div>
          {siteName}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 72, lineHeight: 1.15, letterSpacing: -2, wordBreak: 'keep-all' }}>{title}</div>
          <div style={{ fontSize: 32, color: '#a1a4ab' }}>{subtitle}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: font ? [{ name: 'Noto Sans KR', data: font, weight: 700, style: 'normal' }] : undefined },
  );
}
