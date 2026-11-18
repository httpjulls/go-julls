/**
 * Biblioteca de materiais escritos com a skill gojulls-pdf (materiais/<topicId>.md), embutida
 * no app: lida e impressa offline, sem custo. Formato combinado:
 *   frontmatter: titulo, subtitulo, disciplina, frequencia, tempo, topicos (lista por vírgula)
 *   corpo: caixas [!formula] etc., "## Exercícios" com **N.** e (A)–(D), "## Gabarito" com **N. X** — resolução
 */
import type { Letter } from '../db/types';
import type { SubjectId } from '../core/exam';
import { seedTopics } from './seed';

export interface Material {
  id: string; // nome do arquivo = topicId principal
  titulo: string;
  subtitulo?: string;
  disciplina?: string;
  frequencia?: number;
  tempo?: string;
  topicos: string[];
  subject: SubjectId | null;
  /** revisão rápida de uma disciplina inteira (mais curta, não aprofunda cada tópico) */
  rapida: boolean;
  body: string;
}

export interface MaterialQuestion {
  number: number;
  statement: string;
  options: Record<Letter, string>;
  answer: Letter | null;
  solution: string;
}

export function parseFrontmatter(text: string): { meta: Record<string, string>; body: string } {
  const src = text.replace(/\r/g, '');
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: src };
  const meta: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^\s*([\wÀ-ſ-]+)\s*:\s*(.*)$/);
    if (kv) meta[kv[1].toLowerCase()] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: src.slice(m[0].length) };
}

const TOPIC_SUBJECT = new Map(seedTopics().map((t) => [t.id, t.subject]));

export function parseMaterial(id: string, raw: string): Material {
  const { meta, body } = parseFrontmatter(raw);
  const topicos = (meta.topicos ?? meta['tópicos'] ?? id)
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!topicos.includes(id) && TOPIC_SUBJECT.has(id)) topicos.unshift(id);
  return {
    id,
    titulo: meta.titulo || meta['título'] || id,
    subtitulo: meta.subtitulo || meta['subtítulo'] || undefined,
    disciplina: meta.disciplina || undefined,
    frequencia: meta.frequencia ? Number(meta.frequencia) || undefined : undefined,
    tempo: meta.tempo || undefined,
    topicos,
    subject: TOPIC_SUBJECT.get(topicos[0]) ?? TOPIC_SUBJECT.get(id) ?? null,
    rapida: /revis[ãa]o r[áa]pida/i.test(meta.titulo ?? ''),
    body,
  };
}

/** Seção "## Nome" até o próximo "## ". */
function section(body: string, name: RegExp): string {
  const lines = body.split('\n');
  const start = lines.findIndex((l) => /^##\s+/.test(l) && name.test(l.replace(/^##\s+/, '')));
  if (start < 0) return '';
  const end = lines.findIndex((l, i) => i > start && /^##\s+/.test(l));
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n');
}

/** Exercícios + gabarito do material, prontos para o banco de questões. */
export function materialQuestions(body: string): MaterialQuestion[] {
  const ex = section(body, /^exerc[íi]cios/i);
  const gab = section(body, /^gabarito/i);
  const out: MaterialQuestion[] = [];
  const blocks = ex.split(/\n(?=\s*\*\*\d{1,2}\.\*\*)/);
  for (const b of blocks) {
    const m = b.match(/^\s*\*\*(\d{1,2})\.\*\*\s*([\s\S]*)$/);
    if (!m) continue;
    const n = Number(m[1]);
    const text = m[2];
    const marks: number[] = [];
    let from = 0;
    for (const L of ['A', 'B', 'C', 'D']) {
      const re = new RegExp(`(^|\\n)\\s*\\(${L}\\)\\s*`, 'g');
      re.lastIndex = from;
      const mm = re.exec(text);
      if (!mm) break;
      marks.push(mm.index + mm[0].length);
      from = mm.index + mm[0].length;
    }
    if (marks.length < 4) continue;
    const starts = marks.map((pos, i) => text.lastIndexOf(`(${'ABCD'[i]})`, pos));
    const options = {} as Record<Letter, string>;
    (['A', 'B', 'C', 'D'] as Letter[]).forEach((L, i) => {
      options[L] = text.slice(marks[i], starts[i + 1] ?? text.length).replace(/\s+/g, ' ').trim();
    });
    out.push({ number: n, statement: text.slice(0, starts[0]).trim(), options, answer: null, solution: '' });
  }
  for (const line of gab.split('\n')) {
    const g = line.match(/^\s*\*\*(\d{1,2})\.\s*([A-D])\*\*\s*[—–-]?\s*(.*)$/);
    if (!g) continue;
    const q = out.find((x) => x.number === Number(g[1]));
    if (q) {
      q.answer = g[2] as Letter;
      q.solution = g[3].trim();
    }
  }
  return out;
}

/** Corpo do material sem exercícios/gabarito (para leitura sem "spoiler"). */
export function theoryOnly(body: string): string {
  return body.replace(/\n##\s+(Exerc[íi]cios|Gabarito)[\s\S]*$/i, '\n');
}

const files = import.meta.glob('/materiais/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const MATERIALS: Material[] = Object.entries(files)
  .map(([path, raw]) => parseMaterial(path.split('/').pop()!.replace(/\.md$/, ''), raw))
  .sort((a, b) => a.id.localeCompare(b.id));

/** Material que cobre um tópico (o principal primeiro). */
export function materialForTopic(topicId: string): Material | undefined {
  return MATERIALS.find((m) => m.id === topicId) ?? MATERIALS.find((m) => m.topicos.includes(topicId));
}

export function claudePrompt(topicName: string, subjectName: string, topicId: string): string {
  return `Usando a skill gojulls-pdf, faça o material do tópico "${topicName}" (${subjectName}, id ${topicId}) no formato da biblioteca do app Go, Julls!: arquivo materiais/${topicId}.md com frontmatter (titulo, subtitulo, disciplina, frequencia, tempo, topicos), caixas [!formula]/[!exemplo]/[!dica]/[!pegadinha]/[!resumo], "## Exercícios" com **N.** e alternativas (A)–(D) uma por linha, e "## Gabarito" com **N. X** — resolução.`;
}
