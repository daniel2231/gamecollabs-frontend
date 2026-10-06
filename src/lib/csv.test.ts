import { describe, expect, it } from 'vitest';
import { csvCell } from './csv';

describe('csvCell', () => {
  it('쉼표·따옴표·줄바꿈을 감싼다', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('a\nb')).toBe('"a\nb"');
    expect(csvCell('plain')).toBe('plain');
  });

  it('수식 주입을 막는다', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('@cmd')).toBe("'@cmd");
  });
});
