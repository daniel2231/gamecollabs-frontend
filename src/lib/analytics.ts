export const GA_ID = 'G-KE94MJRC3Z';

/** 이 브라우저의 방문을 GA에서 빼는 표시. 관리자 화면에 들어오면 남고, `?notrack=0`으로 지운다 */
export const ANALYTICS_OPT_OUT_KEY = 'ct-no-analytics';

/**
 * GA4가 이미 거르는 알려진 봇(IAB 목록) 밖에서, JS를 실행하는 크롤러·미리보기·자동화 도구의 User-Agent.
 * 사람 브라우저 UA에는 나오지 않는 낱말만 둔다
 */
export const BOT_UA_PATTERN =
  'bot|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|prerender|phantomjs|selenium|puppeteer|playwright|facebookexternalhit|embedly|preview|python|curl|wget|httpclient|axios|node-fetch';

/**
 * gtag 설정 스크립트. 다음 경우 `ga-disable-<ID>`를 켜서 아무 히트도 보내지 않는다(gtag 공식 옵트아웃)
 * - 운영자: 관리자 화면에 들어간 적이 있는 브라우저, 또는 `?notrack`을 붙여 연 브라우저(`?notrack=0`이면 해제)
 * - 자동화: navigator.webdriver, 봇 User-Agent
 * - 로컬 개발 서버
 */
export function analyticsBootstrap(id: string = GA_ID): string {
  return `(function(){var w=window,n=navigator,k=${JSON.stringify(ANALYTICS_OPT_OUT_KEY)},off=false;
try{var q=new URLSearchParams(location.search).get('notrack');if(q==='0')localStorage.removeItem(k);else if(q!==null)localStorage.setItem(k,'1');off=localStorage.getItem(k)==='1';}catch(e){}
if(off||n.webdriver||/${BOT_UA_PATTERN}/i.test(n.userAgent||'')||/^(localhost|127\\.0\\.0\\.1|\\[::1\\])$/.test(location.hostname))w['ga-disable-${id}']=true;
w.dataLayer=w.dataLayer||[];w.gtag=w.gtag||function(){w.dataLayer.push(arguments);};w.gtag('js',new Date());w.gtag('config','${id}');})();`;
}

/** 관리자 화면에서 부른다: 이후 이 브라우저로 보는 공개 페이지도 집계에서 빠진다 */
export function optOutOfAnalytics(storage: Pick<Storage, 'setItem'> = localStorage): void {
  try {
    storage.setItem(ANALYTICS_OPT_OUT_KEY, '1');
  } catch {
    // 사생활 보호 모드 등에서 저장소가 막혀 있으면 그대로 둔다(관리자 화면 자체는 GA를 싣지 않는다)
  }
}
