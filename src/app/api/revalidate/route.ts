import { revalidateTag } from 'next/cache';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

/** Express가 발행·수정 후 호출: { "tags": ["collabs", "collab:<slug>", "property:<slug>"] } */
const bodySchema = z.object({
  tags: z
    .array(z.string().regex(/^(collabs|taxonomies|(collab|property|company):[a-z0-9-]+)$/))
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
  return NextResponse.json({ revalidated: parsed.data.tags });
}
