'use client';

import { Link, usePathname } from '@/i18n/navigation';

/** 헤더 메뉴. 지금 보고 있는 구역(그 경로와 하위 경로)의 링크에 aria-current를 단다 */
export function HeaderNav({ label, items }: { label: string; items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="ct-header-links">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} className="ct-header-nav" aria-current={active ? 'page' : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
