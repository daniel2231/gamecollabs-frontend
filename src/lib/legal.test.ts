import { describe, expect, it } from 'vitest';
import { privacyMarkdown } from '@/content/legal/privacy';
import { termsMarkdown } from '@/content/legal/terms';
import { legalContact } from './legal';

describe('legalContact', () => {
  it('reads and trims the operator name and email', () => {
    expect(legalContact({ LEGAL_OPERATOR_NAME: ' 홍길동 ', LEGAL_CONTACT_EMAIL: ' a@b.co ' })).toEqual({ operator: '홍길동', email: 'a@b.co' });
  });

  it('drops empty or malformed values', () => {
    expect(legalContact({ LEGAL_OPERATOR_NAME: '  ', LEGAL_CONTACT_EMAIL: 'not-an-email' })).toEqual({ operator: null, email: null });
    expect(legalContact({})).toEqual({ operator: null, email: null });
  });
});

describe('legal documents', () => {
  const docs = (contact: ReturnType<typeof legalContact>) =>
    (['ko', 'en'] as const).flatMap((l) => [privacyMarkdown(l, contact), termsMarkdown(l, contact)]);

  it('link the contact email when one is set', () => {
    for (const doc of docs({ operator: null, email: 'a@b.co' })) expect(doc).toContain('mailto:a@b.co');
  });

  it('fall back to the report page without an email', () => {
    for (const doc of docs({ operator: null, email: null })) expect(doc).toMatch(/\]\(\/(ko|en)\/report\)/);
  });

  it('only link to pages in the same locale', () => {
    for (const l of ['ko', 'en'] as const) {
      const other = l === 'ko' ? 'en' : 'ko';
      for (const doc of [privacyMarkdown(l, { operator: null, email: null }), termsMarkdown(l, { operator: null, email: null })]) {
        expect(doc).not.toContain(`](/${other}/`);
      }
    }
  });
});
