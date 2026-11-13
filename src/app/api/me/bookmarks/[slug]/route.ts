import type { NextRequest } from 'next/server';
import { withMember } from '@/lib/auth/member-route';

/** 콜라보 저장: GET 저장 여부, PUT 저장, DELETE 해제 → `{ bookmarked }` */

type Ctx = RouteContext<'/api/me/bookmarks/[slug]'>;

export async function GET(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  return withMember(req, async (me) => ({ bookmarked: await me.isBookmarked(slug) }));
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  return withMember(req, async (me) => ({ bookmarked: await me.setBookmark(slug, true) }));
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  return withMember(req, async (me) => ({ bookmarked: await me.setBookmark(slug, false) }));
}
