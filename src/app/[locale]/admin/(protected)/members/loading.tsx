import { Flex, Skeleton } from '@radix-ui/themes';

export default function Loading() {
  return (
    <main className="ct-admin-main">
      <Flex direction="column" gap="4">
        <Skeleton width="160px" height="32px" />
        <Skeleton width="100%" height="120px" />
        <Skeleton width="100%" height="320px" />
      </Flex>
    </main>
  );
}
