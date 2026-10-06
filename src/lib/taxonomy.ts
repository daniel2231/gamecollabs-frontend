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
