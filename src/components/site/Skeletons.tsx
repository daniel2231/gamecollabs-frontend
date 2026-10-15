import { Box, Flex, Skeleton } from '@radix-ui/themes';
import { LoadingStatus } from './Pending';

/**
 * loading.tsx용 뼈대 화면. 실제 페이지와 같은 레이아웃 클래스를 써서
 * 내용이 들어올 때 자리가 크게 움직이지 않게 한다.
 */

function Line({ width, height = 16 }: { width: number | string; height?: number }) {
  return <Skeleton width={typeof width === 'number' ? `${width}px` : width} height={`${height}px`} />;
}

function Block({ height }: { height: number }) {
  return <Skeleton width="100%" height={`${height}px`} />;
}

function CardSkeleton() {
  return (
    <div className="ct-card" aria-hidden="true">
      <div className="ct-card-cover" />
      <Flex direction="column" gap="2">
        <Line width={110} height={12} />
        <Line width="80%" height={20} />
        <Line width="50%" height={14} />
      </Flex>
    </div>
  );
}

function Grid({ count }: { count: number }) {
  return (
    <ul className="ct-grid">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <CardSkeleton />
        </li>
      ))}
    </ul>
  );
}

/** 홈: 제목·진행 상태 숫자·카드 묶음 */
export function HomeSkeleton() {
  return (
    <div aria-busy="true">
      <LoadingStatus />
      <Flex align="center" justify="between" mb="5">
        <Line width={420} height={72} />
      </Flex>
      <div className="ct-stats" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <Flex key={i} direction="column" gap="2" py="4">
            <Line width={64} height={40} />
            <Line width={56} height={14} />
          </Flex>
        ))}
      </div>
      <div className="ct-home">
        {[0, 1].map((i) => (
          <Flex key={i} direction="column" gap="5">
            <Line width={160} height={24} />
            <Grid count={4} />
          </Flex>
        ))}
      </div>
    </div>
  );
}

/** 콜라보 목록: 제목·탭·필터·카드 그리드 */
export function ListSkeleton() {
  return (
    <div aria-busy="true">
      <LoadingStatus />
      <Flex align="center" justify="between" mb="5">
        <Line width={420} height={72} />
      </Flex>
      <Flex gap="5" mb="5" pb="2" style={{ borderBottom: '1px solid var(--ct-line)' }}>
        {[48, 64, 48, 48].map((w, i) => (
          <Line key={i} width={w} height={20} />
        ))}
      </Flex>
      <div className="ct-split">
        <aside className="ct-side ct-filter" style={{ flexBasis: 248 }}>
          <Flex direction="column" gap="3">
            <Line width={60} height={18} />
            {Array.from({ length: 8 }, (_, i) => (
              <Line key={i} width={`${60 + ((i * 17) % 35)}%`} height={16} />
            ))}
          </Flex>
        </aside>
        <section className="ct-main">
          <Flex justify="end" mb="4">
            <Line width={160} height={32} />
          </Flex>
          <Grid count={6} />
        </section>
      </div>
    </div>
  );
}

/** 콜라보 상세: 가운데 한 열 */
export function ArticleSkeleton() {
  return (
    <div className="ct-article" aria-busy="true">
      <LoadingStatus />
      <Flex direction="column" gap="7">
        <Flex direction="column" gap="3">
          <Line width={180} height={14} />
          <Line width={140} height={20} />
          <Line width="70%" height={40} />
          <Flex gap="2">
            <Line width={96} height={32} />
            <Line width={96} height={32} />
          </Flex>
        </Flex>
        <Block height={76} />
        {[3, 5].map((rows, i) => (
          <Flex key={i} direction="column" gap="3">
            <Line width={90} height={24} />
            {rows === 3 ? (
              <>
                <Line width="100%" />
                <Line width="95%" />
                <Line width="60%" />
              </>
            ) : (
              <Block height={rows * 48} />
            )}
          </Flex>
        ))}
      </Flex>
    </div>
  );
}

/** 작품·회사 상세: 머리(이름+통계) 아래 타임라인과 사이드 */
export function EntitySkeleton() {
  return (
    <div aria-busy="true">
      <LoadingStatus />
      <Flex wrap="wrap" gap="6" align="end" justify="between" pb="6" mb="6" style={{ borderBottom: '1px solid var(--ct-line)' }}>
        <Flex direction="column" gap="3">
          <Line width={140} height={14} />
          <Line width={320} height={52} />
          <Line width={160} height={18} />
        </Flex>
        <Box style={{ flex: '0 1 520px' }}>
          <Block height={84} />
        </Box>
      </Flex>
      <div className="ct-split">
        <section className="ct-main">
          <Flex direction="column" gap="3">
            <Line width={120} height={28} />
            {Array.from({ length: 4 }, (_, i) => (
              <Block key={i} height={72} />
            ))}
          </Flex>
        </section>
        <aside className="ct-side">
          <Flex direction="column" gap="4">
            <Block height={180} />
            <Block height={140} />
          </Flex>
        </aside>
      </div>
    </div>
  );
}

/** 관리자 편집기 영역 */
export function AdminEditorSkeleton() {
  return (
    <main className="ct-admin-main" aria-busy="true">
      <LoadingStatus />
      <Flex direction="column" gap="5">
        <Flex justify="between" align="center" gap="3" wrap="wrap">
          <Line width={260} height={28} />
          <Flex gap="2">
            <Line width={72} height={32} />
            <Line width={72} height={32} />
          </Flex>
        </Flex>
        {[120, 200, 160, 120].map((h, i) => (
          <Flex key={i} direction="column" gap="2">
            <Line width={100} height={18} />
            <Block height={h} />
          </Flex>
        ))}
      </Flex>
    </main>
  );
}

/** 관리자 검수 큐: 왼쪽 목록 + 편집기 */
export function AdminQueueSkeleton() {
  return (
    <>
      <section className="ct-admin-queue" aria-hidden="true">
        <Flex direction="column" gap="3" p="4" style={{ borderBottom: '1px solid var(--ct-line)' }}>
          <Line width={90} height={22} />
          <Flex gap="2">
            {[40, 64, 56, 40].map((w, i) => (
              <Line key={i} width={w} height={24} />
            ))}
          </Flex>
        </Flex>
        {Array.from({ length: 5 }, (_, i) => (
          <Flex key={i} direction="column" gap="2" px="4" py="3" style={{ borderBottom: '1px solid var(--ct-line-soft)' }}>
            <Line width={120} height={16} />
            <Line width="85%" height={16} />
            <Line width={100} height={12} />
          </Flex>
        ))}
      </section>
      <AdminEditorSkeleton />
    </>
  );
}

/** 관리자 표 화면(작품·회사, 분류 어휘) */
export function AdminTableSkeleton() {
  return (
    <main className="ct-admin-main" aria-busy="true">
      <LoadingStatus />
      <Flex direction="column" gap="4">
        <Flex justify="between" align="center">
          <Line width={200} height={28} />
          <Line width={100} height={32} />
        </Flex>
        <Line width={360} height={32} />
        <Block height={360} />
      </Flex>
    </main>
  );
}
