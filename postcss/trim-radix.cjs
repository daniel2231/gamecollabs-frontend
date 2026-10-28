/**
 * Radix Themes CSS에서 이 사이트가 절대 쓰지 않는 규칙을 빌드 때 지운다(첫 화면을 막는 CSS를 줄이려고).
 *
 * - 반응형 변형(`.md\:rt-r-size-2` 등): props에 { initial, md } 같은 객체를 넘길 때만 붙는 클래스다.
 *   src에서 반응형 props를 쓰기 시작하면 이 규칙을 빼야 한다.
 * - 밝은 테마 토큰: <html class="dark">와 <Theme appearance="dark">로 항상 어두운 테마다.
 * - globals.css에서 불러오지 않는 팔레트의 accent·gray 연결(`[data-accent-color=ruby]` 등).
 *   새 color 값을 쓰면 globals.css의 @import와 아래 COLORS 둘 다에 더한다.
 */
const COLORS = new Set(['gray', 'sand', 'amber', 'blue', 'grass', 'green', 'indigo', 'orange', 'red']);

const RESPONSIVE = /(^|[\s.:(,])(xs|sm|md|lg|xl)\\:/;
const LIGHT = /\.light(-theme)?(?![\w-])/;
const PALETTE = /\[data-(?:accent|gray)-color=["']?([a-z]+)["']?\]/g;

function unusedPalette(selector) {
  for (const [, color] of selector.matchAll(PALETTE)) if (!COLORS.has(color)) return true;
  return false;
}

/** @type {import('postcss').PluginCreator<void>} */
module.exports = () => ({
  postcssPlugin: 'trim-radix',
  Once(root, { result }) {
    if (!result.opts.from?.includes('@radix-ui/themes')) return;
    root.walkRules((rule) => {
      const selectors = rule.selectors;
      const light = selectors.some((s) => LIGHT.test(s));
      // `:root, .light, .light-theme`의 :root는 밝은 테마 기본값이라 함께 지운다
      const kept = selectors.filter(
        (s) => !RESPONSIVE.test(s) && !LIGHT.test(s) && !(light && s.trim() === ':root') && !unusedPalette(s),
      );
      if (kept.length === 0) rule.remove();
      else if (kept.length < selectors.length) rule.selectors = kept;
    });
    // 안의 규칙이 모두 지워진 @media·@supports 정리
    root.walkAtRules((at) => {
      if (at.nodes && at.nodes.length === 0) at.remove();
    });
    root.walkAtRules((at) => {
      if (at.nodes && at.nodes.length === 0) at.remove();
    });
  },
});
module.exports.postcss = true;
module.exports.COLORS = COLORS;
