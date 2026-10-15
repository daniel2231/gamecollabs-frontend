/**
 * 'A × B' 구분자를 강조색(.ct-x)으로 감싼다.
 * 데이터에는 알파벳 x로 쓴 제목도 있어('A x B') 양옆이 띄어진 소문자 x도 ×로 바꿔 보여준다.
 * 'X-Men'처럼 단어에 붙은 X나 대문자 X는 건드리지 않는다.
 */
const SEPARATOR = /\s[x×]\s|×/;

export function SignalX({ text }: { text: string }) {
  return text.split(SEPARATOR).flatMap((part, i) =>
    i
      ? [
          ' ',
          <span key={i} className="ct-x">
            ×
          </span>,
          ' ',
          part.trimStart(),
        ]
      : [part.trimEnd()],
  );
}
