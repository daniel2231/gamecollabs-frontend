import { beforeAll, describe, expect, it } from 'vitest';
import { discordAvatarUrl, displayName, memberLoginPath, safeMemberNext, signMemberSession, verifyMemberSession } from './member';

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret-that-is-at-least-32-characters';
});

describe('member session', () => {
  it('round-trips a member token', async () => {
    const token = await signMemberSession({ id: 'abc123', name: 'Tester', avatarUrl: 'https://cdn.discordapp.com/x.png' });
    expect(await verifyMemberSession(token)).toMatchObject({ id: 'abc123', name: 'Tester', avatarUrl: 'https://cdn.discordapp.com/x.png' });
    expect(await verifyMemberSession(`${token}x`)).toBeNull();
  });

  it('keeps redirects on this site', () => {
    expect(safeMemberNext('/en/collabs/a-b?x=1')).toBe('/en/collabs/a-b?x=1');
    expect(safeMemberNext('/ko')).toBe('/ko');
    expect(safeMemberNext('//evil.com')).toBe('/ko');
    expect(safeMemberNext('/\\evil.com')).toBe('/ko');
    expect(safeMemberNext('https://evil.com/ko')).toBe('/ko');
    expect(safeMemberNext('/fr/x', 'en')).toBe('/en');
    expect(safeMemberNext(null)).toBe('/ko');
  });

  it('builds the login path in the locale of the return address', () => {
    expect(memberLoginPath('/en/bookmarks', 'expired')).toBe('/en/login?next=%2Fen%2Fbookmarks&error=expired');
    expect(memberLoginPath('/ko')).toBe('/ko/login?next=%2Fko');
  });

  it('prefers the Discord display name and falls back to default avatars', () => {
    expect(displayName({ username: 'user', globalName: 'Shown' })).toBe('Shown');
    expect(displayName({ username: 'user', globalName: null })).toBe('user');
    expect(discordAvatarUrl({ discordId: '80351110224678912', avatar: 'a_123' })).toBe('https://cdn.discordapp.com/avatars/80351110224678912/a_123.png?size=64');
    expect(discordAvatarUrl({ discordId: '80351110224678912', avatar: null })).toMatch(/^https:\/\/cdn\.discordapp\.com\/embed\/avatars\/[0-5]\.png$/);
  });
});
