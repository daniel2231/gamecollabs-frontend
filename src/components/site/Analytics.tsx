import Script from 'next/script';
import { analyticsBootstrap, GA_ID } from '@/lib/analytics';

/**
 * Google Analytics. 공개 사이트 레이아웃에만 둔다(관리자 화면에는 싣지 않는다).
 * gtag.js(수백 KB)는 첫 화면·하이드레이션과 메인 스레드를 다투지 않도록 브라우저가 한가할 때 받는다.
 * 설정 명령은 바로 dataLayer에 쌓아 두므로 gtag.js가 늦게 와도 첫 페이지뷰는 그때 함께 보낸다.
 * 운영자·봇·로컬 방문은 analyticsBootstrap이 옵트아웃 플래그로 뺀다
 */
export function Analytics() {
  return (
    <>
      <Script id="ga-init">{analyticsBootstrap()}</Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="lazyOnload" />
    </>
  );
}
