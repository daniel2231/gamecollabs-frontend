/** 공개 개인정보 처리방침·이용약관 경로(언어 접두어 제외) */
export const PRIVACY_PATH = '/privacy';
export const TERMS_PATH = '/terms';

/** 시행일. 본문을 바꿀 때 함께 올리고, 이전 판은 git 기록으로 남는다 */
export const LEGAL_EFFECTIVE_DATE = '2026-11-13';

export type LegalContact = {
  /** 운영자(개인정보 보호책임자) 이름. 비우면 "GameCollabs 운영자" */
  operator: string | null;
  /** 개인정보·약관 문의 이메일. 비우면 제보 페이지로 안내한다 */
  email: string | null;
};

/** 문의처는 배포 환경에서 정한다(LEGAL_OPERATOR_NAME, LEGAL_CONTACT_EMAIL) */
export function legalContact(env: Record<string, string | undefined> = process.env): LegalContact {
  const operator = env.LEGAL_OPERATOR_NAME?.trim() || null;
  const email = env.LEGAL_CONTACT_EMAIL?.trim() || null;
  return { operator, email: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null };
}
