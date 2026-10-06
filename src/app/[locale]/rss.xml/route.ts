import { getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { siteUrl } from '@/lib/site';

export const revalidate = 3600;

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

/** F-11: 최신 발행 콜라보, ko/en 피드 분리 */
export async function GET(_req: Request, { params }: RouteContext<'/[locale]/rss.xml'>) {
  const { locale } = await params;
  if (!isLocale(locale)) return new Response('Not found', { status: 404 });
  const t = await getTranslations({ locale, namespace: 'Site' });
  const list = await api.listCollabs(
    { sort: 'recent', limit: 30, category: [], partner_category: [], region: [], platform: [], collab_type: [] },
    locale,
  );
  const base = siteUrl();
  const items = list.items
    .map((c) => {
      const link = `${base}/${locale}/collabs/${c.slug}`;
      return `<item><title>${esc(c.title)}</title><link>${link}</link><guid isPermaLink="true">${link}</guid>${
        c.publishedAt ? `<pubDate>${new Date(c.publishedAt).toUTCString()}</pubDate>` : ''
      }</item>`;
    })
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(t('name'))}</title><link>${base}/${locale}</link><description>${esc(t('description'))}</description><language>${locale}</language><atom:link href="${base}/${locale}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
