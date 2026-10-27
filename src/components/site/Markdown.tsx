import ReactMarkdown, { type Components } from 'react-markdown';

const components: Components = {
  // 본문 안의 제목은 페이지 제목(h1)·항목 제목(h2) 아래 단계로 내린다
  h1: ({ node: _node, ...props }) => <h3 {...props} />,
  h2: ({ node: _node, ...props }) => <h3 {...props} />,
  a: ({ node: _node, href, ...props }) => {
    const external = !!href && /^https?:\/\//.test(href);
    return <a href={href} {...props} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} />;
  },
};

/** 관리자가 쓴 마크다운(변경 내역). HTML 태그는 그리지 않는다 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="ct-markdown">
      <ReactMarkdown skipHtml components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
