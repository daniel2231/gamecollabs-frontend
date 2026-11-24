import { describe, expect, it } from 'vitest';
import { countSelected, flatten, searchTree, type TermNode } from './taxonomy';

const node = (key: string, label: string, depth = 0, children: TermNode[] = []): TermNode => ({ key, label, depth, children });

const tree: TermNode[] = [
  node('region.asia', '아시아', 0, [node('region.asia.japan', '일본', 1), node('region.asia.korea', '한국', 1)]),
  node('region.north_america', 'North America', 0, [node('region.north_america.us', 'United States', 1)]),
  node('region.global', '글로벌'),
];

describe('searchTree', () => {
  it('하위 항목도 찾고 바로 위 항목 이름을 함께 준다', () => {
    expect(searchTree(tree, '일본').map((m) => [m.node.key, m.parent])).toEqual([['region.asia.japan', '아시아']]);
  });

  it('대소문자와 공백을 가리지 않는다', () => {
    expect(searchTree(tree, 'northamerica').map((m) => m.node.key)).toEqual(['region.north_america']);
    expect(searchTree(tree, 'united s').map((m) => m.node.key)).toEqual(['region.north_america.us']);
  });

  it('빈 검색어는 아무것도 돌려주지 않는다', () => {
    expect(searchTree(tree, '  ')).toEqual([]);
  });
});

describe('countSelected', () => {
  it('자기 자신과 하위에서 고른 수', () => {
    expect(countSelected(tree[0]!, ['region.asia.japan', 'region.asia.korea', 'region.global'])).toBe(2);
    expect(countSelected(tree[0]!, ['region.asia'])).toBe(1);
    expect(flatten(tree)).toHaveLength(6);
  });
});
