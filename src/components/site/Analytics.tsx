import Script from 'next/script';

const GA_ID = 'G-KE94MJRC3Z';

/**
 * Google Analytics. gtag.js(수백 KB)는 첫 화면·하이드레이션과 메인 스레드를 다투지 않도록 브라우저가 한가할 때 받는다.
 * 설정 명령은 바로 dataLayer에 쌓아 두므로 gtag.js가 늦게 와도 첫 페이지뷰는 그때 함께 보낸다
 */
export function Analytics() {
  return (
    <>
      <Script id="ga-init">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="lazyOnload" />
    </>
  );
}
