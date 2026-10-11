'use client';

import { Spinner, VisuallyHidden } from '@radix-ui/themes';
import { useLinkStatus } from 'next/link';
import { useTranslations } from 'next-intl';

/**
 * 같은 페이지 안에서 조건만 바꾸는 이동(필터·탭·정렬 등)의 대기 표시.
 * data-pending이 문서에 생기면 CSS(:has)가 .ct-pending-target을 흐리게 한다.
 * scope="list"는 목록까지 다시 읽는 이동이라 .ct-pending-list도 함께 흐린다.
 */
export function PendingMark({ pending, scope }: { pending: boolean; scope?: 'list' }) {
  return pending ? <span data-pending={scope ?? ''} hidden /> : null;
}

/**
 * <Link> 안에 넣어 그 링크의 이동이 진행 중인지 표시한다.
 * spinner면 링크 안에 스피너를 보이고, dim={false}면 다른 영역은 흐리지 않는다(더 보기 등)
 */
export function LinkPending({ scope, spinner, dim = true }: { scope?: 'list'; spinner?: boolean; dim?: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {spinner && pending && <Spinner size="1" />}
      {dim && <PendingMark pending={pending} scope={scope} />}
    </>
  );
}

/** loading.tsx 스켈레톤의 스크린리더용 안내 */
export function LoadingStatus() {
  const t = useTranslations('Site');
  return (
    <VisuallyHidden>
      <span role="status">{t('loading')}</span>
    </VisuallyHidden>
  );
}
