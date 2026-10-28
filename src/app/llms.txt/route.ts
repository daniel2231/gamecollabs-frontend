import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { CHANGELOG_PATH } from '@/lib/changelog';
import { LIST_PATH } from '@/lib/list-url';
import { STATS_PATH } from '@/lib/stats';
import { siteUrl } from '@/lib/site';
import { FACET_PARAMS, SORTS } from '@/schema/constants';

/** API를 부르지 않으므로 빌드 때 한 번 만든다(백엔드가 멈춰도 빌드·응답에 영향이 없다) */
export const dynamic = 'force-static';

/**
 * llms.txt(https://llmstxt.org): AI 크롤러·에이전트가 사이트 구조와 주소 규칙을 빠르게 파악하도록 하는 안내문.
 * 언어 접두어 밖 경로라 [locale] 라우트로 들어가지 않는다
 */
export async function GET() {
  const base = siteUrl();
  const [en, ko] = await Promise.all([
    getTranslations({ locale: 'en', namespace: 'Site' }),
    getTranslations({ locale: 'ko', namespace: 'Site' }),
  ]);
  const page = (locale: string, path: string) => `${base}/${locale}${path}`;
  const both = (path: string) => routing.locales.map((l) => `[${l}](${page(l, path)})`).join(' · ');

  const body = `# ${en('name')}

> ${en('description')}
>
> ${ko('description')}

Every entry is reviewed by a person against public sources (official announcements, press releases, store pages) before it is published. Dates that have not been announced are left blank rather than guessed. Content is available in Korean (\`/ko\`) and English (\`/en\`); the URL structure is the same in both.

## Main pages

- Home: ${both('')} — ongoing collabs, upcoming starts, collabs ending soon
- All collabs: ${both(LIST_PATH)} — searchable, filterable list
- Statistics: ${both(STATS_PATH)} — counts by category, partner type, region, platform and company; yearly reports at \`/{locale}${STATS_PATH}/{year}\`
- Changelog: ${both(CHANGELOG_PATH)}

## URL patterns

- Collab detail: \`${base}/{locale}/collabs/{slug}\` — dates, participating game and IP, companies, what the collab adds, and source links
- Game or IP (property): \`${base}/{locale}/properties/{slug}\` — every collab of that game, anime, film, character or brand
- Company: \`${base}/{locale}/companies/{slug}\` — every collab a company developed, published or licensed
- List filters (combine freely): \`${base}/{locale}${LIST_PATH}?q={text}&phase={ongoing|upcoming|ended}&sort={${SORTS.join('|')}}&from={YYYY-MM}&to={YYYY-MM}\`
- Taxonomy filters: ${FACET_PARAMS.map((f) => `\`${f}\``).join(', ')} (comma-separated keys, e.g. \`?region=region.japan,region.korea\`)

## Feeds

- [Sitemap](${base}/sitemap.xml): every published page in both languages
- RSS, latest published collabs: ${routing.locales.map((l) => `[${l}](${page(l, '/rss.xml')})`).join(' · ')}

## Optional

- Report a missing collab or a correction: ${both('/report')}
- ${en('disclaimer')}
`;

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
