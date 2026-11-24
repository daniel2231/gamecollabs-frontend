import { getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { collabMarkdown } from '@/lib/collab-markdown';
import { formatDate, formatPeriod, formatPeriodEnd, periodLabels } from '@/lib/format';
import { siteUrl } from '@/lib/site';

// 상세 페이지와 같은 갱신 주기(웹훅 태그가 먼저 갱신하고, 하루 한 번은 안전망)
export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

/**
 * 콜라보 상세의 마크다운 사본. 공개 주소는 `/{locale}/collabs/{slug}.md`(next.config rewrites)이고,
 * 상세 페이지 <head>의 `rel="alternate" type="text/markdown"`과 llms.txt가 이 주소를 알린다.
 * HTML 페이지가 정본이므로 검색 색인에서는 빼고(noindex) canonical을 HTML로 둔다
 */
export async function GET(_req: Request, { params }: RouteContext<'/[locale]/collabs/[slug]/md'>) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return new Response('Not found', { status: 404 });
  const collab = await api.getCollab(slug, locale);
  if (!collab) return new Response('Not found', { status: 404 });

  const [t, tPeriod, tPhase, tRole] = await Promise.all([
    getTranslations({ locale, namespace: 'Detail' }),
    getTranslations({ locale, namespace: 'Period' }),
    getTranslations({ locale, namespace: 'Phase' }),
    getTranslations({ locale, namespace: 'Role' }),
  ]);
  const labels = periodLabels(tPeriod);
  const start = formatDate(collab.period.start, collab.period.precision);
  const estimatedEnd = collab.phase === 'ended' && collab.period.endKind === 'conditional';
  const base = siteUrl();

  const body = collabMarkdown(collab, {
    base,
    locale,
    text: {
      phase: estimatedEnd ? tPeriod('endedEstimated') : tPhase(collab.phase),
      start: start ?? tPeriod('unknown'),
      end: start ? formatPeriodEnd(collab.period, labels) : tPeriod('unknown'),
      labels: {
        start: t('start'),
        end: t('end'),
        status: t('status'),
        summary: t('summary'),
        classification: t('classification'),
        category: t('labels.category'),
        partner: t('labels.partner'),
        region: t('labels.region'),
        platform: t('labels.platform'),
        type: t('labels.type'),
        venues: t('venues'),
        parties: t('parties'),
        companies: t('companies'),
        sources: t('sources'),
        related: t('related'),
        primary: t('primary'),
        archived: t('archived'),
        accessed: t('sourceColumns.accessed'),
        updated: t('updated', { date: '' }).replace(/[\s:]+$/, ''),
        page: t('meta.page'),
        note: t('meta.markdownNote'),
      },
      partyRole: (role) => tRole(role),
      companyRole: (role) => tRole(role),
      sourceType: (type) => t(`sourceType.${type}`),
      relation: (relation) => t(`relation.${relation}`),
      period: (r) => formatPeriod(r.period, labels),
    },
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'X-Robots-Tag': 'noindex',
      Link: `<${base}/${locale}/collabs/${slug}>; rel="canonical"`,
    },
  });
}
