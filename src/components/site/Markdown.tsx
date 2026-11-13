import ReactMarkdown, { type Components } from 'react-markdown';

const link: Components['a'] = ({ node: _node, href, ...props }) => {
  const external = !!href && /^https?:\/\//.test(href);
  return <a href={href} {...props} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} />;
};

const components: Components = {
  // 본문 안의 제목은 페이지 제목(h1)·항목 제목(h2) 아래 단계로 내린다
  h1: ({ node: _node, ...props }) => <h3 {...props} />,
  h2: ({ node: _node, ...props }) => <h3 {...props} />,
  a: link,
};

/** 문서 한 편이 페이지 전체인 경우(약관 등): 본문의 ## 를 그대로 h2로 둔다 */
const documentComponents: Components = { a: link };

/** 관리자가 쓴 마크다운(변경 내역)이나 코드에 둔 문서(약관). HTML 태그는 그리지 않는다 */
export function Markdown({ children, document = false }: { children: string; document?: boolean }) {
  return (
    <div className={document ? 'ct-markdown ct-markdown-document' : 'ct-markdown'}>
      <ReactMarkdown skipHtml components={document ? documentComponents : components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
