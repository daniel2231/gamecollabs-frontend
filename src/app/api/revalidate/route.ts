import { revalidateTag } from 'next/cache';
import { timingSafeEqual } from 'node:crypto';
import { after, NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { indexNowKey, submitIndexNow, urlsForTags } from '@/lib/indexnow';
import { siteUrl } from '@/lib/site';

/**
 * Express가 발행·수정 후 호출: { "tags": ["collabs", "collab:<slug>", "property:<slug>"] }.
 * 작품의 홈 노출(순서·대표 이미지)을 바꾸면 "featured", 공개 변경 내역을 바꾸면 "changelog"를 보낸다
 */
const bodySchema = z.object({
  tags: z
    .array(z.string().regex(/^(collabs|taxonomies|featured|changelog|(collab|property|company):[a-z0-9-]+)$/))
    .min(1)
    .max(50),
});

function authorized(req: NextRequest): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  const header = req.headers.get('authorization') ?? '';
  if (!secret) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: 'validation_failed' } }, { status: 422 });
  for (const tag of parsed.data.tags) revalidateTag(tag, 'max');
  // sitemap은 'collabs' 태그로 읽으므로 위에서 함께 갱신된다. 검색엔진에는 응답을 보낸 뒤 알린다
  const key = indexNowKey();
  if (key) {
    const base = siteUrl();
    after(() => submitIndexNow(urlsForTags(parsed.data.tags, base), { key, base }));
  }
  return NextResponse.json({ revalidated: parsed.data.tags });
}
