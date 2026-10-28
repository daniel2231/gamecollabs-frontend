import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * postcss/trim-radix.cjs는 쓰지 않는다고 가정한 Radix 규칙을 지운다.
 * 그 가정이 깨지면 화면이 조용히 어긋나므로 여기서 미리 막는다
 */
const { COLORS } = createRequire(import.meta.url)('../../postcss/trim-radix.cjs') as { COLORS: Set<string> };

const ROOT = join(import.meta.dirname, '..');
const sources = (readdirSync(ROOT, { recursive: true }) as string[])
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => ({ file: f, text: readFileSync(join(ROOT, f), 'utf8') }));

describe('Radix CSS 정리 플러그인의 가정', () => {
  it('반응형 props({ initial, md } 같은 객체)를 쓰지 않는다', () => {
    const found = sources.filter((s) => /=\{\{[^}]*\b(initial|xs|sm|md|lg|xl)\s*:/.test(s.text)).map((s) => s.file);
    expect(found, '반응형 props를 쓰려면 postcss/trim-radix.cjs의 RESPONSIVE 정리를 빼야 한다').toEqual([]);
  });

  it('쓰는 color 값은 모두 불러온 팔레트다', () => {
    const used = new Set(
      sources.flatMap((s) => [...s.text.matchAll(/\b(?:color|accentColor|grayColor)=\{?['"]([a-z]+)['"]/g)].map((m) => m[1]!)),
    );
    // color={a ? 'red' : 'gray'}: 비교값('published' 등)이 아니라 ? · : 뒤의 결과만 센다
    for (const s of sources) for (const m of s.text.matchAll(/color=\{[^}]*\}/g)) for (const c of m[0].matchAll(/[?:]\s*'([a-z]+)'/g)) used.add(c[1]!);
    expect([...used].filter((c) => !COLORS.has(c))).toEqual([]);
  });

  it('globals.css가 불러오는 팔레트와 플러그인의 목록이 같다', () => {
    const css = readFileSync(join(ROOT, 'app/globals.css'), 'utf8');
    const imported = [...css.matchAll(/@radix-ui\/themes\/tokens\/colors\/([a-z]+)\.css/g)].map((m) => m[1]);
    expect(new Set(imported)).toEqual(COLORS);
  });
});
