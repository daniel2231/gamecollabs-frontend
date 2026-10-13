import { describe, expect, it } from 'vitest';
import { alternatesFor, defaultOgImage, languageAlternates, openGraphFor, siteVerification } from './seo';

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

describe('siteVerification', () => {
  it('기본값으로 네이버·Bing 태그를 내보내고, 구글은 DNS로 확인하므로 넣지 않는다', () => {
    expect(siteVerification({})).toEqual({
      other: {
        'naver-site-verification': '2b4e141d453ae14f742454abbd865feb25672b8d',
        'msvalidate.01': '442FC2131C37B6876E5B9C499116854B',
      },
    });
  });

  it('환경 변수가 있으면 그 값을 쓴다', () => {
    expect(siteVerification({ GOOGLE_SITE_VERIFICATION: 'g', NAVER_SITE_VERIFICATION: 'n', BING_SITE_VERIFICATION: '' })).toEqual({
      google: 'g',
      other: { 'naver-site-verification': 'n', 'msvalidate.01': '442FC2131C37B6876E5B9C499116854B' },
    });
  });
});
