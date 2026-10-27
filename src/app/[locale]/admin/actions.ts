'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { adminApi, ApiError, isMockApi } from '@/lib/api';
import type { EntityInput, QueueFilter, QueueResponse, TermInput } from '@/lib/api/types';
import { getAdminSession } from '@/lib/auth/session';
import {
  adminCoverSchema,
  COLLAB_STATUSES,
  collabInputSchema,
  entityKindSchema,
  FOLLOW_UP_ACTIONS,
  ORIGIN_TYPES,
  SUBMISSION_STATUSES,
  taxonomySchema,
  TRANSITIONS,
  type AdminCollab,
  type AdminEntity,
  type CollabInput,
  type EntityKind,
  type FollowUpAction,
  type MatchResponse,
  type Submission,
  type SubmissionStatus,
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

const queueFilterSchema = z.object({
  status: z.enum(['review', ...COLLAB_STATUSES]),
  origin: z.enum(ORIGIN_TYPES).optional(),
  cover: z.literal('missing').optional(),
  q: z.string().trim().max(100).optional(),
  cursor: z.string().min(1).max(200),
});

/** 검수 큐 다음 페이지(한 번에 100건) */
export async function loadQueuePage(filter: QueueFilter): Promise<ActionResult<Pick<QueueResponse, 'items' | 'nextCursor'>>> {
  return run(async (api) => {
    const { items, nextCursor } = await api.listQueue(queueFilterSchema.parse(filter));
    return { items, nextCursor };
  });
}

/** 저장된 커버의 원본 주소를 우리 저장소로 복사한다(다른 사이트에서 끌어온 이미지) */
export async function mirrorCollabCover(id: string): Promise<ActionResult<{ result: 'mirrored' | 'skipped' | 'failed'; collab: AdminCollab }>> {
  return run((api) => api.mirrorCover(z.string().min(1).max(64).parse(id)));
}

/** 재확인 제안 반영(현재 rev 필요)·버리기, 또는 초안에 바로 반영된 변경 확인 */
export async function resolveFollowUp(id: string, action: FollowUpAction, rev?: number): Promise<ActionResult<AdminCollab>> {
  return run((api) =>
    api.resolveFollowUp(
      z.string().min(1).max(64).parse(id),
      z.enum(FOLLOW_UP_ACTIONS).parse(action),
      rev === undefined ? undefined : z.number().int().min(1).parse(rev),
    ),
  );
}

/** 제보 처리: 반영함(accepted)·버림(dismissed)·다시 열기(new) */
export async function updateSubmission(id: string, status: SubmissionStatus): Promise<ActionResult<Submission>> {
  return run((api) => api.updateSubmission(z.string().min(1).max(64).parse(id), z.enum(SUBMISSION_STATUSES).parse(status)));
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
  name: z.object({ ko: z.string().trim().min(1, '필수'), en: z.string().trim().min(1, '필수'), original: z.string().trim().nullable() }),
  aliases: z.array(z.string().trim().min(1)).max(50),
  category: z.string().nullable(),
  country: z.string().regex(/^[A-Z]{2}$/, 'ISO 3166-1 alpha-2 (예: JP)').nullable(),
  featuredOrder: z.number().int().min(1, '1 이상').max(999, '999 이하').nullable().optional(),
  image: adminCoverSchema.nullable().optional(),
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
