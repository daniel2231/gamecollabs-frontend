/** 제목 속 '×'만 강조색(.ct-x)으로 감싼다 */
export function SignalX({ text }: { text: string }) {
  return text.split('×').flatMap((part, i) => (i ? [<span key={i} className="ct-x">×</span>, part] : [part]));
}
