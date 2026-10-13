import { indexNowKey } from '@/lib/indexnow';

/** IndexNow 키 파일. 키가 설정되지 않았으면 404 */
export function GET() {
  const key = indexNowKey();
  if (!key) return new Response('Not found', { status: 404 });
  return new Response(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
