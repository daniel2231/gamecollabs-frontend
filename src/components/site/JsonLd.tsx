import { serializeJsonLd } from '@/lib/jsonld';

/** schema.org 구조화 데이터 한 덩어리(또는 여러 덩어리) */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
