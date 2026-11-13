import { Link as RadixLink } from '@radix-ui/themes';
import { getTranslations } from 'next-intl/server';
import { Markdown } from '@/components/site/Markdown';
import { Link } from '@/i18n/navigation';
import { LEGAL_EFFECTIVE_DATE, PRIVACY_PATH, TERMS_PATH } from '@/lib/legal';

/** 개인정보 처리방침·이용약관 공통 틀: 제목, 시행일, 다른 문서 링크, 본문 */
export async function LegalDocument({ kind, body }: { kind: 'privacy' | 'terms'; body: string }) {
  const t = await getTranslations('Legal');
  const other = kind === 'privacy' ? 'terms' : 'privacy';
  return (
    <article className="ct-article ct-legal">
      <header className="ct-hero">
        <div>
          <h1>{t(`${kind}.title`)}</h1>
          <p className="ct-stats-lead">
            {t('effective', { date: LEGAL_EFFECTIVE_DATE.replaceAll('-', '.') })}
            {' · '}
            <RadixLink asChild color="gray">
              <Link href={other === 'privacy' ? PRIVACY_PATH : TERMS_PATH}>{t(`${other}.title`)}</Link>
            </RadixLink>
          </p>
        </div>
      </header>
      <Markdown document>{body}</Markdown>
    </article>
  );
}
