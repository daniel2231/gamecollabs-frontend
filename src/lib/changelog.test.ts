import { describe, expect, it } from 'vitest';
import { versionAnchor } from './changelog';

describe('versionAnchor', () => {
  it('버전을 링크용 id로 바꾼다', () => {
    expect(versionAnchor('1.4.0')).toBe('v1-4-0');
    expect(versionAnchor('v2')).toBe('v2');
    expect(versionAnchor('V2.0.0-beta+1')).toBe('v2-0-0-beta-1');
    expect(versionAnchor('2026.10')).toBe('v2026-10');
  });
});
