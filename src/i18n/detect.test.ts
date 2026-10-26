import { describe, expect, it } from 'vitest';
import { detectLocale } from './detect';

describe('detectLocale', () => {
  it('브라우저 1순위 언어가 ko/en이면 국가와 상관없이 따른다', () => {
    expect(detectLocale('en-US,en;q=0.9,ko;q=0.8', 'KR')).toBe('en');
    expect(detectLocale('ko-KR,ko;q=0.9,en-US;q=0.8', 'US')).toBe('ko');
    expect(detectLocale('ja;q=0.5,ko;q=0.9', 'JP')).toBe('ko'); // 순서가 아니라 q값으로
  });

  it('1순위 언어가 지원하지 않는 언어면 국가로 정한다', () => {
    expect(detectLocale('ja-JP,ja;q=0.9,en;q=0.8', 'KR')).toBe('ko');
    expect(detectLocale('ja-JP,ja;q=0.9,ko;q=0.8', 'JP')).toBe('en');
    expect(detectLocale(null, 'kr')).toBe('ko');
    expect(detectLocale('*', 'DE')).toBe('en');
  });

  it('국가를 모르면 next-intl 기본 감지에 맡긴다', () => {
    expect(detectLocale('fr-FR', null)).toBeUndefined();
    expect(detectLocale(null, null)).toBeUndefined();
  });
});
