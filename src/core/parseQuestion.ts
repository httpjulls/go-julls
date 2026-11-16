/** Lê uma questão colada (enunciado + alternativas A–D + gabarito opcional). */
export type Letter = 'A' | 'B' | 'C' | 'D';

export interface ParsedQuestion {
  statement: string;
  options: Record<Letter, string>;
  answer: Letter | null;
}

const OPT = /^\s*\(?([A-Da-d])\s*[).\-–:]\s*(.*)$/;
const ANS = /^\s*(gabarito|resposta|resp\.?|correta)\s*[:\-–]?\s*\(?([A-Da-d])\)?\s*$/i;

export function parseQuestion(text: string): ParsedQuestion {
  const lines = text.replace(/\r/g, '').split('\n');
  const options: Record<Letter, string> = { A: '', B: '', C: '', D: '' };
  const stmt: string[] = [];
  let current: Letter | null = null;
  let answer: Letter | null = null;
  for (const line of lines) {
    const a = line.match(ANS);
    if (a) {
      answer = a[2].toUpperCase() as Letter;
      continue;
    }
    const m = line.match(OPT);
    if (m) {
      const L = m[1].toUpperCase() as Letter;
      // aceita só a próxima letra esperada, para não confundir "a) " dentro do enunciado
      const expected: Letter = current === null ? 'A' : current === 'A' ? 'B' : current === 'B' ? 'C' : 'D';
      if (L === expected || (current !== null && L > current)) {
        current = L;
        options[L] = m[2].trim();
        continue;
      }
    }
    if (current) options[current] = (options[current] + ' ' + line.trim()).trim();
    else stmt.push(line);
  }
  return { statement: stmt.join('\n').trim(), options, answer };
}
