import { NextResponse, type NextRequest } from 'next/server';
import type { FollowType } from '@/lib/api';
import { NO_STORE, withMember } from '@/lib/auth/member-route';

/** 작품(property)·회사(company) 팔로우: PUT 팔로우, DELETE 해제 → `{ following }` */

type Ctx = RouteContext<'/api/me/follows/[type]/[slug]'>;

const isType = (v: string): v is FollowType => v === 'property' || v === 'company';

async function set(req: NextRequest, ctx: Ctx, on: boolean) {
  const { type, slug } = await ctx.params;
  if (!isType(type)) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
  return withMember(req, async (me) => ({ following: await me.setFollow(type, slug, on) }));
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return set(req, ctx, true);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return set(req, ctx, false);
}
