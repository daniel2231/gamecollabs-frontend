/*
 * 사이트 엠블럼(＋·▶·× 를 잇는 선). 선은 currentColor라 부모의 글자색을 따른다.
 * 그리기 애니메이션은 globals.css의 .ct-lm-* 규칙이 맡는다(처음 한 번, 그리고 .ct-logo에 마우스를 올릴 때마다 다시).
 */
export const LOGO_VIEWBOX = '400 430 448 396';

export const LOGO_TRACES = [
  // 왼쪽 아래가 열린 호 — 왼쪽 위 원의 곡선이 아래 원의 오른쪽 위로 이어진다
  'M507 660 C454 649 417 605 417 553 C417 494 465 446 525 446 C584 446 629 491 629 551 C628 595 640 615 673 631 C710 650 725 681 725 711 C725 769 679 811 620 811 C561 811 516 766 516 710 C516 651 558 607 615 600',
  // 오른쪽이 열린 호
  'M640 495 C659 463 690 446 730 446 C788 446 831 493 831 553 C831 607 799 648 777 660',
] as const;

export const LOGO_MARKS = [
  'M526 514 V603 M481 559 H571', // ＋
  'M704 514 L770 559 L704 604 Z', // ▶
  'M590 677 L649 736 M649 677 L590 736', // ×
] as const;

export function LogoMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={['ct-lm', className].filter(Boolean).join(' ')}
      viewBox={LOGO_VIEWBOX}
      width={Math.round((size * 448) / 396)}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      {LOGO_TRACES.map((d, i) => (
        <path key={d} className={`ct-lm-trace ct-lm-t${i + 1}`} pathLength={1} d={d} />
      ))}
      {LOGO_MARKS.map((d, i) => (
        <path key={d} className={`ct-lm-mark ct-lm-m${i + 1}`} d={d} />
      ))}
    </svg>
  );
}
