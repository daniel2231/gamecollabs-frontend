import type { Locale, Taxonomy, TaxonomyTerm } from '@/schema';

export type TermNode = { key: string; label: string; depth: number; children: TermNode[] };

/** 분류 하나의 트리. order 순, 폐기 항목 제외 */
export function buildTree(terms: TaxonomyTerm[], taxonomy: Taxonomy, locale: Locale): TermNode[] {
  const list = terms.filter((t) => t.taxonomy === taxonomy && !t.deprecated).sort((a, b) => a.order - b.order);
  const build = (parent: string | null, depth: number): TermNode[] =>
    list
      .filter((t) => t.parent === parent)
      .map((t) => ({ key: t.key, label: t.label[locale], depth, children: build(t.key, depth + 1) }));
  return build(null, 0);
}

/** 트리를 화면 순서대로 펼침 */
export function flatten(nodes: TermNode[]): TermNode[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children)]);
}

export function labelMap(terms: TaxonomyTerm[], locale: Locale): Map<string, string> {
  return new Map(terms.map((t) => [t.key, t.label[locale]]));
}

/** 비교용: 대소문자·전각/반각·공백 차이를 없앤다("North America"와 "northamerica", "ＰＣ"와 "pc"가 같다) */
export function normalizeTerm(s: string): string {
  return s.normalize('NFKC').toLowerCase().replace(/[\s·・\-_]/g, '');
}

/** 노드와 그 아래에서 고른 항목 수 */
export function countSelected(node: TermNode, selected: readonly string[]): number {
  return flatten([node]).filter((n) => selected.includes(n.key)).length;
}

export type TermMatch = { node: TermNode; parent: string | null };

/** 이름에 검색어가 들어간 항목을 화면 순서대로. 하위 항목은 바로 위 항목 이름을 함께 돌려준다 */
export function searchTree(nodes: TermNode[], query: string): TermMatch[] {
  const q = normalizeTerm(query);
  if (!q) return [];
  const walk = (list: TermNode[], parent: string | null): TermMatch[] =>
    list.flatMap((n) => [...(normalizeTerm(n.label).includes(q) ? [{ node: n, parent }] : []), ...walk(n.children, n.label)]);
  return walk(nodes, null);
}
