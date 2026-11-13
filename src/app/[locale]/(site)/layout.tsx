import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MemberProvider } from '@/components/member/MemberProvider';
import { MockBanner, SiteFooter } from '@/components/site/SiteChrome';
import { SiteHeader } from '@/components/site/SiteHeader';

export default async function SiteLayout({ children, params }: LayoutProps<'/[locale]'>) {
  setRequestLocale((await params).locale);
  const t = await getTranslations('Site');
  return (
    // 헤더 계정 메뉴와 본문의 저장·팔로우 버튼이 /api/me 응답 하나를 나눠 쓴다
    <MemberProvider>
      <a href="#main" className="ct-skip">
        {t('skip')}
      </a>
      <SiteHeader />
      <MockBanner />
      <main id="main" className="ct-container" style={{ paddingTop: 32, paddingBottom: 64, minHeight: '60vh' }}>
        {children}
      </main>
      <SiteFooter />
    </MemberProvider>
  );
}
