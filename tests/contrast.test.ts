/** Confere o contraste (WCAG) de todas as combinações de texto usadas, nos dois temas. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/index.css', 'utf8');

function block(selector: string): Record<string, number[]> {
  const i = css.indexOf(selector);
  const body = css.slice(css.indexOf('{', i) + 1, css.indexOf('}', i));
  const vars: Record<string, number[]> = {};
  for (const m of body.matchAll(/--([a-z]+):\s*(\d+)\s+(\d+)\s+(\d+)/g)) vars[m[1]] = [+m[2], +m[3], +m[4]];
  return vars;
}

const lum = ([r, g, b]: number[]) => {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export const ratio = (a: number[], b: number[]) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const TEXT_ON = ['bg', 'surface', 'elevated'];
const TEXTS = ['ink', 'muted', 'accent', 'warn', 'pinks'];

describe.each([
  ['escuro', ":root[data-theme='dark']"],
  ['claro', ":root[data-theme='light']"],
])('tema %s', (_n, sel) => {
  const v = block(sel);
  it('lê todas as variáveis', () => {
    for (const k of [...TEXT_ON, ...TEXTS, 'pink', 'onpink']) expect(v[k], k).toBeDefined();
  });
  for (const t of TEXTS)
    for (const bg of TEXT_ON)
      it(`${t} sobre ${bg} ≥ 4,5:1`, () => {
        expect(ratio(v[t], v[bg])).toBeGreaterThanOrEqual(4.5);
      });
  it('botão primário: texto preto sobre rosa ≥ 4,5:1', () => {
    expect(ratio(v.onpink, v.pink)).toBeGreaterThanOrEqual(4.5);
  });
});

it('paleta oficial: #FF2E93 com texto #0B0B0F', () => {
  expect(ratio([255, 46, 147], [11, 11, 15])).toBeGreaterThan(5);
});
