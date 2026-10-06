import { notFound } from 'next/navigation';

/** 알 수 없는 경로를 [locale]/not-found.tsx로 보낸다. (site) 그룹 안에 두면 admin 경로를 가리므로 이 위치에 둔다 */
export default function CatchAll() {
  notFound();
}
