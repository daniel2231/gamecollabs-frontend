'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { FollowType, MemberState } from '@/lib/api/types';
import { loginHref } from './loginHref';

type Me = { name: string; avatarUrl: string };
type Status = 'loading' | 'out' | 'in';
/** 실패 이유: 개수 제한(limit) 또는 그 밖(failed). 로그아웃 상태면 로그인으로 보내므로 돌아오지 않는다 */
export type ToggleError = 'limit' | 'failed';

type Ctx = {
  status: Status;
  me: Me | null;
  isBookmarked(slug: string): boolean;
  isFollowing(type: FollowType, slug: string): boolean;
  toggleBookmark(slug: string): Promise<ToggleError | null>;
  toggleFollow(type: FollowType, slug: string): Promise<ToggleError | null>;
};

const MemberContext = createContext<Ctx | null>(null);

export function useMember(): Ctx {
  const ctx = useContext(MemberContext);
  if (!ctx) throw new Error('useMember must be used inside <MemberProvider>');
  return ctx;
}

const EMPTY: MemberState = { bookmarks: [], follows: { property: [], company: [] } };

/**
 * 페이지마다 /api/me를 한 번만 불러 헤더 메뉴와 화면의 모든 저장·팔로우 버튼이 나눠 쓴다.
 * 공개 페이지는 정적이라 서버에서 쿠키를 읽지 않는다. 버튼은 누르는 즉시 바뀌고(낙관적 갱신) 실패하면 되돌린다.
 */
export function MemberProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<Me | null>(null);
  const [state, setState] = useState<MemberState>(EMPTY);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/me', { signal: ctrl.signal, cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<{ member: Me | null; state: MemberState | null }>) : { member: null, state: null }))
      .then((body) => {
        setMe(body.member);
        setState(body.state ?? EMPTY);
        setStatus(body.member ? 'in' : 'out');
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setStatus('out');
      });
    return () => ctrl.abort();
  }, []);

  const bookmarks = useMemo(() => new Set(state.bookmarks), [state.bookmarks]);
  const follows = useMemo(() => ({ property: new Set(state.follows.property), company: new Set(state.follows.company) }), [state.follows]);

  /** 목록에 넣거나 빼고, 요청이 실패하면 되돌린다 */
  const toggle = useCallback(
    async (url: string, on: boolean, apply: (s: MemberState, on: boolean) => MemberState): Promise<ToggleError | null> => {
      if (status !== 'in') {
        window.location.href = loginHref();
        return null;
      }
      setState((s) => apply(s, on));
      try {
        const r = await fetch(url, { method: on ? 'PUT' : 'DELETE' });
        if (r.ok) return null;
        setState((s) => apply(s, !on));
        if (r.status === 401) {
          window.location.href = loginHref();
          return null;
        }
        return r.status === 409 ? 'limit' : 'failed';
      } catch {
        setState((s) => apply(s, !on));
        return 'failed';
      }
    },
    [status],
  );

  const value = useMemo<Ctx>(
    () => ({
      status,
      me,
      isBookmarked: (slug) => bookmarks.has(slug),
      isFollowing: (type, slug) => follows[type].has(slug),
      toggleBookmark: (slug) =>
        toggle(`/api/me/bookmarks/${encodeURIComponent(slug)}`, !bookmarks.has(slug), (s, on) => ({
          ...s,
          bookmarks: on ? [slug, ...s.bookmarks.filter((x) => x !== slug)] : s.bookmarks.filter((x) => x !== slug),
        })),
      toggleFollow: (type, slug) =>
        toggle(`/api/me/follows/${type}/${encodeURIComponent(slug)}`, !follows[type].has(slug), (s, on) => ({
          ...s,
          follows: { ...s.follows, [type]: on ? [slug, ...s.follows[type].filter((x) => x !== slug)] : s.follows[type].filter((x) => x !== slug) },
        })),
    }),
    [status, me, bookmarks, follows, toggle],
  );

  return <MemberContext value={value}>{children}</MemberContext>;
}
