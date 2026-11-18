/** Testa a importação com os cadernos reais em docs/ (lidos com pdf.js, como no app). */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { applyAnswerKey, pageToLines, parseAnswerKey, parseExam, subjectByNumber, type PageText } from '../src/import/examParser';

const require = createRequire(import.meta.url);

async function readPdf(path: string): Promise<PageText[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(path)), isEvalSupported: false, useSystemFonts: true }).promise;
  const pages: PageText[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const c = await page.getTextContent();
    pages.push({
      page: n,
      width: vp.width,
      height: vp.height,
      items: (c.items as { str?: string; transform?: number[]; width?: number; height?: number }[])
        .filter((i) => typeof i.str === 'string' && i.transform)
        .map((i) => ({ str: i.str!, x: i.transform![4], y: i.transform![5], w: i.width ?? 0, h: i.height || 10 })),
    });
  }
  return pages;
}

describe('parser de prova (texto sintético)', () => {
  it('separa duas colunas e lê questões, alternativas e gabarito', () => {
    const page: PageText = {
      page: 1,
      width: 600,
      height: 800,
      items: [
        { str: '01 Quanto é 2 + 2?', x: 40, y: 700, w: 200, h: 10 },
        { str: '(A) 3', x: 40, y: 680, w: 40, h: 10 },
        { str: '(B) 4', x: 40, y: 665, w: 40, h: 10 },
        { str: '(C) 5', x: 40, y: 650, w: 40, h: 10 },
        { str: '(D) 6', x: 40, y: 635, w: 40, h: 10 },
        { str: '02 Capital do Brasil:', x: 320, y: 700, w: 200, h: 10 },
        { str: '(A) Rio', x: 320, y: 680, w: 60, h: 10 },
        { str: '(B) Brasília', x: 320, y: 665, w: 60, h: 10 },
        { str: '(C) SP', x: 320, y: 650, w: 60, h: 10 },
        { str: '(D) BH', x: 320, y: 635, w: 60, h: 10 },
      ],
    };
    const qs = parseExam(pageToLines(page));
    expect(qs.map((q) => q.number)).toEqual([1, 2]);
    expect(qs[0].options.B).toBe('4');
    expect(qs[1].statement).toBe('Capital do Brasil:');
    const withKey = applyAnswerKey(qs, parseAnswerKey('GABARITO\n01 - B\n02 - B'));
    expect(withKey.map((q) => q.answer)).toEqual(['B', 'B']);
  });
  it('aceita o formato "1." dos materiais da skill e ignora números de linha dos textos', () => {
    const lines = ['Texto 1', '5 grandes planos', '**1.** Primeira?', '10 querer de fato', '(A) a', '(B) b', '(C) c', '(D) d', '**2.** Segunda?', '(A) a', '(B) b', '(C) c', '(D) d', '## Gabarito', '**1. A** — ok', '**2. D** — ok'].map((text) => ({ text, page: 1 }));
    const qs = parseExam(lines);
    expect(qs).toHaveLength(2);
    expect(qs[0].statement).toContain('10 querer de fato');
    expect(qs[0].options.D).toBe('d');
    expect(qs[1].options.D).toBe('d');
    const key = parseAnswerKey(lines.slice(13).map((l) => l.text).join('\n'));
    expect(key.get(1)).toEqual(['A']);
    expect(key.get(2)).toEqual(['D']);
  });
  it('gabarito em tabela só de letras vira ordem 1, 2, 3…', () => {
    const k = parseAnswerKey('Questão\n1 2 3 4\nResposta\nB C A D');
    // pares "1 2" não são letras: cai no modo sequência
    expect([...k.values()].slice(0, 4).map((x) => x[0])).toEqual(['B', 'C', 'A', 'D']);
  });
  it('disciplina pela posição', () => {
    expect(subjectByNumber(1)).toBe('por');
    expect(subjectByNumber(15)).toBe('fis');
    expect(subjectByNumber(33)).toBe('mat');
    expect(subjectByNumber(44)).toBe('lem');
  });
});

const caderno = 'docs/Caderno-de-Questoes_Vestibular-CEDERJ-2026-2.pdf';
describe.skipIf(!existsSync(caderno))('caderno real 2026.2', () => {
  let qs: ReturnType<typeof parseExam> = [];
  beforeAll(async () => {
    const pages = await readPdf(caderno);
    qs = parseExam(pages.flatMap(pageToLines));
  }, 60000);
  it('encontra as 45 questões (e o 2º idioma de 43–45)', () => {
    const nums = new Set(qs.map((q) => q.number));
    for (let n = 1; n <= 45; n++) expect(nums.has(n), `questão ${n}`).toBe(true);
  });
  it('a maioria tem as 4 alternativas', () => {
    const full = qs.filter((q) => q.options.A && q.options.B && q.options.C && q.options.D);
    expect(full.length / qs.length).toBeGreaterThan(0.8);
  });
  it('Física 15 é de circuitos e Matemática 33 é de trigonometria', () => {
    expect(qs.find((q) => q.number === 15)!.statement).toMatch(/resistores/i);
    expect(qs.find((q) => q.number === 33)!.statement).toMatch(/quadrante/i);
    expect(qs.find((q) => q.number === 15)!.subject).toBe('fis');
  });
});
