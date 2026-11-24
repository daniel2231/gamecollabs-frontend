import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { ANALYTICS_OPT_OUT_KEY, analyticsBootstrap, optOutOfAnalytics } from './analytics';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';
const KEY = 'ga-disable-G-TEST';

function run({ url = 'https://gamecollabs.example/ko', ua = CHROME, webdriver = false, stored = {} as Record<string, string> } = {}) {
  const store = new Map(Object.entries(stored));
  const location = new URL(url);
  const window: Record<string, unknown> = {};
  const context = {
    window,
    navigator: { userAgent: ua, webdriver },
    location,
    URLSearchParams,
    Date,
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  };
  runInNewContext(analyticsBootstrap('G-TEST'), context);
  return { disabled: window[KEY] === true, dataLayer: window.dataLayer as unknown[][], store };
}

describe('analyticsBootstrap', () => {
  it('일반 방문은 집계하고 config 명령을 쌓는다', () => {
    const r = run();
    expect(r.disabled).toBe(false);
    expect(r.dataLayer.map((args) => Array.from(args)[0])).toEqual(['js', 'config']);
  });

  it('관리자 표시가 있는 브라우저는 뺀다', () => {
    expect(run({ stored: { [ANALYTICS_OPT_OUT_KEY]: '1' } }).disabled).toBe(true);
  });

  it('?notrack은 표시를 남기고, ?notrack=0은 지운다', () => {
    const on = run({ url: 'https://gamecollabs.example/ko?notrack' });
    expect(on.disabled).toBe(true);
    expect(on.store.get(ANALYTICS_OPT_OUT_KEY)).toBe('1');
    const off = run({ url: 'https://gamecollabs.example/ko?notrack=0', stored: { [ANALYTICS_OPT_OUT_KEY]: '1' } });
    expect(off.disabled).toBe(false);
    expect(off.store.has(ANALYTICS_OPT_OUT_KEY)).toBe(false);
  });

  it.each([
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/142.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  ])('봇·자동화 UA는 뺀다: %s', (ua) => {
    expect(run({ ua }).disabled).toBe(true);
  });

  it('webdriver(자동화 브라우저)와 로컬 개발 서버는 뺀다', () => {
    expect(run({ webdriver: true }).disabled).toBe(true);
    expect(run({ url: 'http://localhost:3000/ko' }).disabled).toBe(true);
    expect(run({ url: 'http://127.0.0.1:3000/ko' }).disabled).toBe(true);
  });

  it('사람이 쓰는 모바일·데스크톱 브라우저는 봇으로 보지 않는다', () => {
    for (const ua of [
      CHROME,
      'Mozilla/5.0 (iPhone; CPU iPhone OS 19_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0',
      'Mozilla/5.0 (Linux; Android 16; SM-S938N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/29.0 Chrome/138.0.0.0 Mobile Safari/537.36',
    ]) {
      expect(run({ ua }).disabled, ua).toBe(false);
    }
  });
});

describe('optOutOfAnalytics', () => {
  it('표시를 남기고, 저장소가 막혀 있어도 던지지 않는다', () => {
    const store = new Map<string, string>();
    optOutOfAnalytics({ setItem: (k, v) => void store.set(k, v) });
    expect(store.get(ANALYTICS_OPT_OUT_KEY)).toBe('1');
    expect(() =>
      optOutOfAnalytics({
        setItem: () => {
          throw new Error('blocked');
        },
      }),
    ).not.toThrow();
  });
});
