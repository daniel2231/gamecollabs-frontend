import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const LEGACY = '/tools/game-ip-collab-tracker';

/** 목록이 홈(`/:locale`)에 있던 때의 쿼리. 하나라도 붙어 오면 `/:locale/collabs`로 옮긴다(쿼리는 그대로 따라간다) */
const LIST_QUERY_KEYS = ['q', 'phase', 'category', 'partner_category', 'region', 'platform', 'collab_type', 'from', 'to', 'sort', 'limit'];

const nextConfig: NextConfig = {
  // F-08: 기존 블로그 경로를 새 경로로 301. 블로그 도메인 쪽에서도 같은 매핑으로 새 도메인을 가리킨다.
  async redirects() {
    return [
      ...LIST_QUERY_KEYS.map((key) => ({
        source: '/:locale(ko|en)',
        has: [{ type: 'query' as const, key }],
        destination: '/:locale/collabs',
        statusCode: 301 as const,
      })),
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
