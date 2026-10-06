import type { NextRequest } from 'next/server';
import { api } from '@/lib/api';
import { parseCollabQuery } from '@/lib/filters';
import { isLocale } from '@/i18n/routing';

/** F-13: 현재 필터 결과 그대로 CSV. 브라우저는 Express를 직접 부르지 않고 여기를 거친다. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const params: Record<string, string[]> = {};
  for (const [k, v] of sp) (params[k] ??= []).push(v);
  const query = { ...parseCollabQuery(params), property: sp.get('property') ?? undefined, company: sp.get('company') ?? undefined };
  const localeParam = sp.get('locale') ?? 'ko';
  const locale = isLocale(localeParam) ? localeParam : 'ko';
  const csv = await api.exportCsv(query, locale);
  const stamp = new Date().toISOString().slice(0, 10);
  const scope = query.property ?? query.company ?? 'collabs';
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${scope}-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
