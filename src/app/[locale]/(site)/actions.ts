'use server';

import { headers } from 'next/headers';
import { api, ApiError } from '@/lib/api';
import { submissionInputSchema } from '@/schema';

export type ReportFieldError = 'required' | 'invalid_url' | 'too_short' | 'too_long';
export type ReportValues = { url?: string; note?: string };
export type ReportState =
  | { status: 'idle' }
  | { status: 'sent' }
  | {
      status: 'error';
      error: 'invalid' | 'rate_limited' | 'bot_check' | 'not_found' | 'unknown';
      fields?: Partial<Record<'url' | 'note', ReportFieldError>>;
      /** 폼이 제출 후 비워지므로 입력값을 돌려줘 다시 채운다 */
      values: ReportValues;
    };

const FIELD_ERRORS = new Set<string>(['required', 'invalid_url', 'too_short', 'too_long']);

/**
 * 방문자 제보(새 콜라보 tip, 발행된 콜라보의 오류 correction). 공개 엔드포인트라 입력을 다시 검증하고,
 * Express에는 서비스 토큰으로 방문자 IP를 X-Client-IP에 담아 보낸다(IP당 시간당 10건 제한은 백엔드가 맡는다).
 */
export async function submitReport(_prev: ReportState, form: FormData): Promise<ReportState> {
  const str = (key: string) => {
    const v = form.get(key);
    return typeof v === 'string' && v.trim() ? v.trim() : undefined;
  };
  // 사람에게는 보이지 않는 칸. 채워졌으면 봇이므로 받은 것처럼 답하고 버린다
  if (str('website')) return { status: 'sent' };
  const values: ReportValues = { url: str('url'), note: str('note') };
  const parsed = submissionInputSchema.safeParse({
    kind: str('kind'),
    url: values.url,
    collab: str('collab'),
    note: values.note,
    locale: str('locale'),
    turnstileToken: str('cf-turnstile-response'),
  });
  if (!parsed.success) {
    const fields: Partial<Record<'url' | 'note', ReportFieldError>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if ((key === 'url' || key === 'note') && !fields[key]) {
        fields[key] = FIELD_ERRORS.has(issue.message) ? (issue.message as ReportFieldError) : key === 'url' ? 'invalid_url' : 'too_long';
      }
    }
    return { status: 'error', error: 'invalid', fields, values };
  }

  const h = await headers();
  const clientIp = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null;
  try {
    await api.submitReport(parsed.data, clientIp);
    return { status: 'sent' };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.code === 'rate_limited' || e.status === 429) return { status: 'error', error: 'rate_limited', values };
      if (e.code === 'bot_check_failed') return { status: 'error', error: 'bot_check', values };
      if (e.status === 404) return { status: 'error', error: 'not_found', values };
      if (e.status === 422) return { status: 'error', error: 'invalid', values };
    }
    console.error('report submission failed', e);
    return { status: 'error', error: 'unknown', values };
  }
}
