/**
 * Transforma o texto de um caderno de prova (já extraído do PDF) em questões A–D,
 * e o texto de um gabarito em respostas. Funções puras: o resultado sempre passa
 * pela revisão da Juliana antes de entrar no banco.
 */
import { EXAM_ORDER, type SubjectId } from '../core/exam';

export type Letter = 'A' | 'B' | 'C' | 'D';
const LETTERS: Letter[] = ['A', 'B', 'C', 'D'];

export interface TextItem {
  str: string;
  x: number;
  y: number; // coordenada do PDF (cresce para cima)
  w: number;
  h: number;
}
export interface PageText {
  page: number;
  width: number;
  height: number;
  items: TextItem[];
}
export interface Line {
  text: string;
  page: number;
  /** posição no PDF (y cresce para cima), para recortar a questão da página */
  top?: number;
  bottom?: number;
  colStart?: number;
  colEnd?: number;
}

export interface Region {
  page: number;
  x0: number;
  x1: number;
  top: number;
  bottom: number;
}

/** Ordena o texto de uma página em linhas, respeitando duas colunas quando houver. */
export function pageToLines(p: PageText): Line[] {
  const items = p.items.filter((i) => i.str.trim());
  if (!items.length) return [];
  const mid = p.width / 2;
  const rightStarts = items.filter((i) => i.x > mid - p.width * 0.02).length;
  const twoCols = rightStarts > items.length * 0.2 && items.filter((i) => i.x + i.w < mid).length > items.length * 0.2;
  const cols = twoCols ? [items.filter((i) => i.x < mid - p.width * 0.02), items.filter((i) => i.x >= mid - p.width * 0.02)] : [items];
  const out: Line[] = [];
  for (const [ci, col] of cols.entries()) {
    const colStart = twoCols && ci === 1 ? mid : 0;
    const colEnd = twoCols && ci === 0 ? mid : p.width;
    const sorted = [...col].sort((a, b) => b.y - a.y || a.x - b.x);
    let cur: TextItem[] = [];
    let curY = Infinity;
    const flush = () => {
      if (!cur.length) return;
      cur.sort((a, b) => a.x - b.x);
      let text = '';
      let lastEnd = -Infinity;
      for (const it of cur) {
        const gap = it.x - lastEnd;
        text += text && gap > Math.max(1, it.h * 0.15) && !text.endsWith(' ') && !it.str.startsWith(' ') ? ' ' + it.str : it.str;
        lastEnd = it.x + it.w;
      }
      out.push({
        text: text.replace(/\s+/g, ' ').trim(),
        page: p.page,
        top: Math.max(...cur.map((i) => i.y + (i.h || 10))),
        bottom: Math.min(...cur.map((i) => i.y)),
        colStart,
        colEnd,
      });
      cur = [];
    };
    for (const it of sorted) {
      const tol = Math.max(2, (it.h || 10) * 0.5);
      if (Math.abs(it.y - curY) > tol) {
        flush();
        curY = it.y;
      }
      cur.push(it);
    }
    flush();
  }
  return out.filter((l) => l.text);
}

export interface ParsedQuestion {
  number: number;
  subject: SubjectId;
  statement: string;
  options: Record<Letter, string>;
  pages: number[];
  /** áreas da página ocupadas pela questão (uma por coluna/página) */
  regions: Region[];
  language?: 'ingles' | 'espanhol';
  /** problemas detectados (alternativas faltando etc.) — mostrados na revisão */
  warnings: string[];
}

/** Disciplina pela posição no caderno CEDERJ (Port 1–6, Bio 7–12, Fís 13–18, …, LE 43–45). */
export function subjectByNumber(n: number): SubjectId {
  let acc = 0;
  for (const { subject, count } of EXAM_ORDER) {
    acc += count;
    if (n <= acc) return subject;
  }
  return 'lem';
}

const NOISE = [/^vestibular\s+\d{4}/i, /^\d{1,2}$/, /^\\?\s*(prova de múltipla escolha)$/i, /^caderno de questões$/i];
const SUBJECT_HEADER = /^\\?\s*(L[ÍI]NGUA PORTUGUESA|BIOLOGIA|F[ÍI]SICA|GEOGRAFIA|HIST[ÓO]RIA|MATEM[ÁA]TICA|QU[ÍI]MICA|L[ÍI]NGUA (ESPANHOLA|INGLESA|ESTRANGEIRA)|ESPANHOL|INGL[ÊE]S|REDA[ÇC][ÃA]O)\b/i;

function detectLanguage(text: string): 'ingles' | 'espanhol' | undefined {
  const t = ` ${text.toLowerCase()} `;
  const en = (t.match(/ (the|and|of|is|are|to|which|text|according) /g) ?? []).length;
  const es = (t.match(/ (el|la|los|las|que|del|es|según|texto|una) /g) ?? []).length;
  if (en === es) return undefined;
  return en > es ? 'ingles' : 'espanhol';
}

/**
 * Encontra as questões. Aceita "01 Enunciado…" (cadernos CEDERJ) e "1. Enunciado…".
 * A numeração precisa ser sequencial (evita confundir com números de linha dos textos);
 * 43–45 podem aparecer duas vezes (espanhol e inglês).
 */
export function parseExam(lines: Line[]): ParsedQuestion[] {
  const clean = lines.filter((l) => !NOISE.some((r) => r.test(l.text)));
  // aceita pontuação solta antes do número (sobras de subscritos na extração do PDF)
  const styles = [/^[.,;·•\s]*(\d{2})\s+(.*)$/, /^\*{0,2}(\d{1,2})[.)]\*{0,2}\s+(.*)$/];
  let best: { starts: { idx: number; n: number; rest: string }[] } = { starts: [] };
  for (const re of styles) {
    const starts: { idx: number; n: number; rest: string }[] = [];
    let expected = 1;
    clean.forEach((l, idx) => {
      const m = l.text.match(re);
      if (!m) return;
      const n = Number(m[1]);
      const last = starts[starts.length - 1]?.n ?? 0;
      const secondLanguage = n === 43 && last === 45;
      if (n === expected || secondLanguage || (n === expected + 1 && n > 1 && starts.length > 0)) {
        starts.push({ idx, n, rest: m[2] ?? '' });
        expected = n + 1;
      }
    });
    if (starts.length > best.starts.length) best = { starts };
  }

  const out: ParsedQuestion[] = [];
  const seen = new Map<number, number>();
  best.starts.forEach((s, k) => {
    const end = best.starts[k + 1]?.idx ?? clean.length;
    const chunk = clean.slice(s.idx, end).filter((l, i) => i === 0 || !SUBJECT_HEADER.test(l.text));
    // para no gabarito/redação (fim das questões)
    const stopAt = chunk.findIndex((l, i) => i > 0 && /^(gabarito|reda[çc][ãa]o)\b/i.test(l.text.replace(/^[\\#\s]+/, '')));
    const body = (stopAt > 0 ? chunk.slice(0, stopAt) : chunk).map((l, i) => (i === 0 ? s.rest : l.text));
    const text = body.join('\n');
    const used = stopAt > 0 ? chunk.slice(0, stopAt) : chunk;
    const pages = [...new Set(used.map((l) => l.page))];
    const regions: Region[] = [];
    for (const l of used) {
      if (l.top === undefined || l.bottom === undefined || l.colStart === undefined || l.colEnd === undefined) continue;
      const r = regions.find((x) => x.page === l.page && x.x0 === l.colStart && x.x1 === l.colEnd);
      if (r) {
        r.top = Math.max(r.top, l.top);
        r.bottom = Math.min(r.bottom, l.bottom);
      } else regions.push({ page: l.page, x0: l.colStart, x1: l.colEnd, top: l.top, bottom: l.bottom });
    }

    // alternativas: última sequência (A) (B) (C) (D) em ordem
    const options: Record<Letter, string> = { A: '', B: '', C: '', D: '' };
    const warnings: string[] = [];
    const marks: number[] = [];
    let from = 0;
    for (const L of LETTERS) {
      const re = new RegExp(`\\(${L}\\)`, 'g');
      re.lastIndex = from;
      const m = re.exec(text);
      if (!m) break;
      marks.push(m.index);
      from = m.index + 3;
    }
    let statement = text;
    if (marks.length === 4) {
      statement = text.slice(0, marks[0]);
      LETTERS.forEach((L, i) => {
        options[L] = text
          .slice(marks[i] + 3, marks[i + 1] ?? text.length)
          .replace(/\s*\n\s*/g, ' ')
          .trim();
      });
    } else warnings.push('Não encontrei as 4 alternativas (A)–(D): confira e complete.');
    // junta as quebras de coluna em parágrafos (mantém quebra depois de ponto final, dois-pontos etc.)
    statement = statement
      .replace(/[ \t]+\n/g, '\n')
      .replace(/([^.:?!;”"’)\n])\n(?=\S)/g, '$1 ')
      .trim();
    if (!statement) warnings.push('Enunciado vazio (pode estar só na figura da página).');
    if (/\b(figura|gr[áa]fico|imagem|ilustra|tabela|heredograma|circuito)\b/i.test(statement)) warnings.push('Tem figura: a foto da página fica anexada à questão.');

    const count = (seen.get(s.n) ?? 0) + 1;
    seen.set(s.n, count);
    const subject = subjectByNumber(s.n);
    const language = subject === 'lem' ? detectLanguage(statement + ' ' + Object.values(options).join(' ')) : undefined;
    out.push({ number: s.n, subject, statement, options, pages, regions, language, warnings });
  });
  return out;
}

/**
 * Lê um gabarito. Aceita "01 A", "1 - A", "Questão 1: A", "1. C — resolução…" e também
 * uma sequência só de letras (assumida em ordem 1, 2, 3…). 43–45 podem ter duas respostas
 * (espanhol e inglês), devolvidas na ordem em que aparecem.
 */
export function parseAnswerKey(text: string): Map<number, Letter[]> {
  const map = new Map<number, Letter[]>();
  const norm = text.replace(/\r/g, '');
  const pair = /(?:quest[ãa]o\s*)?\b(\d{1,2})\s*[-–.:)]?\s*\(?([A-D])\)?(?![A-Za-zÀ-ÿ])/g;
  let m: RegExpExecArray | null;
  while ((m = pair.exec(norm))) {
    const n = Number(m[1]);
    if (n < 1 || n > 60) continue;
    const L = m[2] as Letter;
    map.set(n, [...(map.get(n) ?? []), L]);
  }
  if (map.size >= 5) return map;
  // fallback: tabela com a linha de números separada da linha de letras
  const letters = norm.match(/(?<![A-Za-zÀ-ÿ])[A-D](?![A-Za-zÀ-ÿ])/g) ?? [];
  const out = new Map<number, Letter[]>();
  letters.forEach((L, i) => out.set(i + 1, [L as Letter]));
  return out;
}

/** Junta questões e gabarito; para 43–45 usa a ocorrência do idioma certo quando houver duas. */
export function applyAnswerKey(qs: ParsedQuestion[], key: Map<number, Letter[]>): (ParsedQuestion & { answer: Letter | null })[] {
  const occ = new Map<number, number>();
  return qs.map((q) => {
    const i = occ.get(q.number) ?? 0;
    occ.set(q.number, i + 1);
    const answers = key.get(q.number) ?? [];
    return { ...q, answer: answers[i] ?? answers[0] ?? null };
  });
}
