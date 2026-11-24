'use client';

import { useEffect } from 'react';
import { optOutOfAnalytics } from '@/lib/analytics';

/** 관리자가 이 브라우저로 공개 페이지를 볼 때도 GA에 잡히지 않도록 옵트아웃 표시를 남긴다 */
export function AnalyticsOptOut() {
  useEffect(() => optOutOfAnalytics(), []);
  return null;
}
