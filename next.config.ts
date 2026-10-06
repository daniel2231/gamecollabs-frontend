import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const LEGACY = '/tools/game-ip-collab-tracker';

const nextConfig: NextConfig = {
  // F-08: 기존 블로그 경로를 새 경로로 301. 블로그 도메인 쪽에서도 같은 매핑으로 새 도메인을 가리킨다.
  async redirects() {
    return [
      { source: LEGACY, destination: '/ko', statusCode: 301 },
      { source: `${LEGACY}/:slug`, destination: '/ko/collabs/:slug', statusCode: 301 },
      { source: `/:locale(ko|en)${LEGACY}`, destination: '/:locale', statusCode: 301 },
      { source: `/:locale(ko|en)${LEGACY}/:slug`, destination: '/:locale/collabs/:slug', statusCode: 301 },
    ];
  },
  images: {
    remotePatterns: process.env.MEDIA_BASE_URL ? [new URL(`${process.env.MEDIA_BASE_URL}/**`)] : [],
  },
};

export default withNextIntl(nextConfig);
