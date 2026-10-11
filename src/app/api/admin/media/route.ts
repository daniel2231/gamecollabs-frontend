import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { adminApi, ApiError } from '@/lib/api';
import { getAdminSession } from '@/lib/auth/session';

/**
 * 관리자 커버 업로드 중계: 브라우저 → (세션 확인) → Express POST /v1/admin/media.
 * 관리자 토큰은 httpOnly 쿠키라 브라우저가 Express로 직접 보낼 수 없어 여기를 거친다.
 * Server Action은 기본 본문 한도가 1MB라 Route Handler로 받는다. 브라우저가 미리 줄여 보내므로
 * 보통 수백 KB이고, Vercel 함수 본문 한도(약 4.5MB) 아래로 상한을 둔다.
 */

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ['image/webp', 'image/jpeg', 'image/png'] as const;
const sizeSchema = z.coerce.number().int().positive().max(10000);

type ErrorBody = { ok: false; error: { code: string; message: string } };
const fail = (status: number, code: string, message: string) =>
  NextResponse.json<ErrorBody>({ ok: false, error: { code, message } }, { status });

/** Content-Type만 믿지 않고 파일 앞부분으로 실제 형식을 확인한다 */
function sniff(head: Uint8Array): (typeof TYPES)[number] | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (head[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
  return null;
}

export async function POST(req: NextRequest) {
  // 쿠키는 SameSite=Lax라 다른 사이트의 POST에는 실리지 않지만, Origin도 한 번 더 본다
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== req.headers.get('host')) return fail(403, 'forbidden', '허용되지 않은 요청입니다');

  const session = await getAdminSession();
  if (!session) return fail(401, 'unauthorized', '다시 로그인하세요');

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return fail(422, 'validation_failed', '이미지 파일이 없습니다');
  if (file.size > MAX_BYTES) return fail(413, 'too_large', '이미지가 너무 큽니다(4MB 이하)');
  const type = sniff(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
  if (!type) return fail(415, 'unsupported_type', 'JPEG·PNG·WebP 이미지만 올릴 수 있습니다');
  const width = sizeSchema.safeParse(form?.get('width'));
  const height = sizeSchema.safeParse(form?.get('height'));
  if (!width.success || !height.success) return fail(422, 'validation_failed', '이미지 크기 정보가 올바르지 않습니다');

  try {
    const data = await adminApi(session.token).uploadMedia(new File([file], file.name || 'cover', { type }), {
      width: width.data,
      height: height.data,
    });
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    if (e instanceof ApiError) return fail(e.status >= 400 && e.status < 600 ? e.status : 502, e.code, e.message);
    console.error(e);
    return fail(500, 'unknown', '업로드 중 알 수 없는 오류가 발생했습니다');
  }
}
