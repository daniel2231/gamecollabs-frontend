import { describe, expect, it } from 'vitest';
import { alternatesFor, defaultOgImage, languageAlternates, openGraphFor, verificationFromEnv } from './seo';

describe('languageAlternates', () => {
  it('언어별 주소와 x-default(ko)를 만든다', () => {
    expect(languageAlternates('/collabs/a')).toEqual({ ko: '/ko/collabs/a', en: '/en/collabs/a', 'x-default': '/ko/collabs/a' });
  });

  it('base를 주면 절대 주소로 만든다', () => {
    expect(languageAlternates('', 'https://x.test')).toEqual({ ko: 'https://x.test/ko', en: 'https://x.test/en', 'x-default': 'https://x.test/ko' });
  });
});

describe('alternatesFor', () => {
  it('현재 언어 주소를 canonical로, 같은 언어 RSS를 함께 넣는다', () => {
    expect(alternatesFor('en', '/companies/b')).toEqual({
      canonical: '/en/companies/b',
      languages: { ko: '/ko/companies/b', en: '/en/companies/b', 'x-default': '/ko/companies/b' },
      types: { 'application/rss+xml': '/en/rss.xml' },
    });
  });
});

describe('openGraphFor', () => {
  it('siteName·locale·url을 채우고 넘긴 값이 기본값을 덮는다', () => {
    expect(openGraphFor({ locale: 'ko', path: '/collabs/a', siteName: 'S', type: 'article', title: 'T' })).toEqual({
      type: 'article',
      siteName: 'S',
      locale: 'ko_KR',
      alternateLocale: ['en_US'],
      url: '/ko/collabs/a',
      title: 'T',
    });
  });
});

describe('defaultOgImage', () => {
  it('언어별 기본 OG 이미지 경로를 가리킨다', () => {
    expect(defaultOgImage('en')).toEqual({ url: '/en/opengraph-image', width: 1200, height: 630, type: 'image/png' });
  });
});

describe('verificationFromEnv', () => {
  it('값이 하나도 없으면 undefined', () => {
    expect(verificationFromEnv({})).toBeUndefined();
  });

  it('있는 값만 넣는다', () => {
    expect(verificationFromEnv({ GOOGLE_SITE_VERIFICATION: 'g', NAVER_SITE_VERIFICATION: 'n' })).toEqual({
      google: 'g',
      other: { 'naver-site-verification': 'n' },
    });
    expect(verificationFromEnv({ BING_SITE_VERIFICATION: 'b' })).toEqual({ other: { 'msvalidate.01': 'b' } });
  });
});
