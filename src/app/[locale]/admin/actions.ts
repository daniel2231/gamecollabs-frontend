'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { adminApi, ApiError, isMockApi } from '@/lib/api';
import type { EntityInput, TermInput } from '@/lib/api/types';
import { getAdminSession } from '@/lib/auth/session';
import {
  collabInputSchema,
  entityKindSchema,
  taxonomySchema,
  TRANSITIONS,
  type AdminCollab,
  type AdminEntity,
  type CollabInput,
  type EntityKind,
  type MatchResponse,
  type TaxonomyTerm,
  type Transition,
} from '@/schema';

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message?: string; fields?: Record<string, string> } };

/** Server Action은 공개 엔드포인트이므로 매번 세션을 다시 확인한다 */
async function run<T>(fn: (api: ReturnType<typeof adminApi>) => Promise<T>): Promise<ActionResult<T>> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: { code: 'unauthorized', message: '다시 로그인하세요' } };
  try {
    const data = await fn(adminApi(session.token));
    // 실제 API 모드에서는 Express가 revalidate 웹훅을 호출한다. 목 모드에서는 직접 갱신.
    if (isMockApi()) revalidatePath('/', 'layout');
    return { ok: true, data };
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: { code: e.code, message: e.message, fields: e.fields } };
    if (e instanceof z.ZodError) {
      const fields = Object.fromEntries(e.issues.map((i) => [i.path.join('.'), i.message]));
      return { ok: false, error: { code: 'validation_failed', fields } };
    }
    console.error(e);
    return { ok: false, error: { code: 'unknown', message: '알 수 없는 오류가 발생했습니다' } };
  }
}

export async function saveCollab(id: string | null, input: CollabInput, rev: number | null): Promise<ActionResult<AdminCollab>> {
  return run(async (api) => {
    const parsed = collabInputSchema.parse(input);
    return id ? api.updateCollab(id, parsed, rev ?? 0) : api.createCollab(parsed);
  });
}

export async function transitionCollab(id: string, action: Transition, reason?: string): Promise<ActionResult<AdminCollab>> {
  return run(async (api) => {
    z.enum(TRANSITIONS).parse(action);
    return api.transition(id, action, reason?.slice(0, 500));
  });
}

export async function getCollabForCompare(id: string): Promise<ActionResult<AdminCollab | null>> {
  return run((api) => api.getCollab(id));
}

export async function matchEntities(name: string): Promise<ActionResult<MatchResponse>> {
  return run((api) => api.match(name.slice(0, 100)));
}

const entityInputSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug는 소문자·숫자·하이픈만'),
  name: z.object({ ko: z.string().trim().min(1, '필수'), en: z.string().trim(), original: z.string().trim().nullable() }),
  aliases: z.array(z.string().trim().min(1)).max(50),
  category: z.string().nullable(),
  country: z.string().regex(/^[A-Z]{2}$/, 'ISO 3166-1 alpha-2 (예: JP)').nullable(),
});

export async function saveEntity(kind: EntityKind, id: string | null, input: EntityInput): Promise<ActionResult<AdminEntity>> {
  return run(async (api) => {
    entityKindSchema.parse(kind);
    const parsed = entityInputSchema.parse(input);
    return id ? api.updateEntity(kind, id, parsed) : api.createEntity(kind, parsed);
  });
}

export async function mergeEntities(kind: EntityKind, sourceId: string, targetId: string): Promise<ActionResult<AdminEntity>> {
  return run((api) => api.mergeEntities(entityKindSchema.parse(kind), sourceId, targetId));
}

const termInputSchema = z.object({
  key: z.string().regex(/^[a-z_]+(\.[a-z0-9_]+)+$/, '소문자·숫자·밑줄과 점만 사용'),
  taxonomy: taxonomySchema,
  parent: z.string().nullable(),
  label: z.object({ ko: z.string().trim().min(1, '필수'), en: z.string().trim().min(1, '필수') }),
  legacyValues: z.array(z.string().trim().min(1)),
});

export async function createTerm(input: TermInput): Promise<ActionResult<TaxonomyTerm>> {
  return run((api) => api.createTerm(termInputSchema.parse(input)));
}
