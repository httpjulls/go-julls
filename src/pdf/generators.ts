/**
 * Monta os documentos que o app imprime/salva em PDF, no estilo Go, Julls!:
 *  - lista de exercícios (do banco, por matéria/tópico/prova/erradas)
 *  - prova completa para fazer no papel (com cartão-resposta)
 *  - pacote de estudo de um tópico (por que importa + formulário + suas anotações + exercícios)
 * O conteúdo vem do que já está no app; nada é inventado.
 */
import type { Note, Question, Topic } from '../db/types';
import { SUBJECT_NAMES, SUBJECT_POINTS, fmt, type SubjectId } from '../core/exam';
import { esc, inline, mdToHtml } from './md';
import { buildDocument, type Tema } from './template';

const LETTERS = ['A', 'B', 'C', 'D'] as const;
const MATH = new Set<SubjectId>(['mat', 'fis', 'qui']);
const FIGURE_HINT = /\b(figura|gr[áa]fico|imagem|ilustra|tabela|heredograma|circuito|charge|mapa|abaixo|a seguir|observe|considere a imagem)\b/i;

/** Ids dos recortes da questão original (importada de PDF); se não houver, as páginas inteiras. */
export function figureIds(q: Question): string[] {
  const crops = (q.images ?? []).filter((id) => id.startsWith('qc-'));
  return crops.length ? crops : q.images ?? [];
}

/** Precisa da imagem? Matéria de cálculo com recorte, figura citada, alternativa vazia, enunciado curto ou caractere que o PDF não extraiu (ex.: Ω). */
export function needsFigure(q: Question): boolean {
  if (!q.images?.length) return false;
  if (MATH.has(q.subject) && q.images.some((id) => id.startsWith('qc-'))) return true;
  const text = q.statement + ' ' + LETTERS.map((L) => q.options[L] ?? '').join(' ');
  return FIGURE_HINT.test(q.statement) || LETTERS.some((L) => !q.options[L]?.trim()) || q.statement.trim().length < 60 || /[�□-]/.test(text);
}

export function questionHtml(q: Question, n: number, images: Map<string, string>): string {
  const fonte = q.examName ? `${q.examName} · nº ${q.number}` : q.source;
  const head = `<p><span class="num">${n}</span>${fonte ? `<span class="fonte">${esc(fonte)}</span>` : ''}</p>`;
  const crops = figureIds(q).filter((id) => id.startsWith('qc-'));
  // Matemática, Física e Química: fórmulas e subscritos só ficam certos no recorte original
  const preferCrop = crops.length > 0 && MATH.has(q.subject);
  const imgs = (needsFigure(q) || preferCrop ? figureIds(q) : []).map((id) => images.get(id)).filter(Boolean) as string[];
  // Questão importada com recorte: imprime o recorte original (fiel ao caderno, com figuras e símbolos)
  if (imgs.length && crops.length) {
    return `<div class="questao">${head}${imgs.map((src) => `<img class="recorte" src="${src}" alt="Questão ${n} (original)">`).join('')}</div>`;
  }
  return `<div class="questao">
  ${head}
  ${mdToHtml(q.statement)}
  ${imgs.map((src) => `<img class="figura" src="${src}" alt="Página da prova">`).join('')}
  <ul class="alts">${LETTERS.map((L) => `<li><b>(${L})</b><span>${inline(q.options[L] ?? '')}</span></li>`).join('')}</ul>
</div>`;
}

export function answerCardHtml(count: number): string {
  const cells = Array.from({ length: count }, (_, i) => `<div><span class="n">${i + 1}</span>${LETTERS.map((L) => `<span class="b">${L}</span>`).join('')}</div>`).join('');
  return `<h2>Cartão-resposta</h2><p><em>Marque à caneta. Depois, no app: Listas e PDFs → Corrigir, e informe o que acertou e errou pelo número.</em></p><div class="cartao">${cells}</div>`;
}

export function answerKeyHtml(qs: Question[], withSolutions: boolean): string {
  const grid = `<div class="gab">${qs.map((q, i) => `<span>${i + 1} <b>${q.answer}</b></span>`).join('')}</div>`;
  const sol = withSolutions
    ? qs
        .map((q, i) => (q.solution?.trim() ? `<p><strong>${i + 1}. ${q.answer}</strong> — ${inline(q.solution.replace(/\n+/g, ' '))}</p>` : ''))
        .join('')
    : '';
  return `<h2 class="quebra">Gabarito</h2>${grid}${sol ? `<h3>Resoluções</h3>${sol}` : ''}`;
}

export interface ListDocOptions {
  titulo: string;
  subtitulo?: string;
  subject?: SubjectId;
  frequencia?: number;
  questions: Question[];
  images: Map<string, string>;
  introMd?: string;
  answerCard?: boolean;
  tema?: Tema;
  tempo?: string;
}

export function buildListDoc(o: ListDocOptions): string {
  const has = o.questions.length > 0;
  const body = [
    o.introMd ? mdToHtml(o.introMd) : '',
    has ? `<h2>Exercícios</h2>` : '',
    o.questions.map((q, i) => questionHtml(q, i + 1, o.images)).join('\n'),
    has && o.answerCard ? answerCardHtml(o.questions.length) : '',
    has ? answerKeyHtml(o.questions, true) : '<p><em>Sem questões deste tópico no banco ainda: importe uma prova ou cadastre questões para elas entrarem aqui.</em></p>',
    has ? `<p><em>Corrija no app pelo número: as erradas vão direto para o banco de erros. Go, Julls!</em></p>` : '',
  ].join('\n');
  return buildDocument(
    {
      titulo: o.titulo,
      subtitulo: o.subtitulo,
      disciplina: o.subject ? SUBJECT_NAMES[o.subject] : undefined,
      pontos: o.subject ? fmt(SUBJECT_POINTS[o.subject]) : undefined,
      frequencia: o.frequencia,
      tempo: o.tempo,
    },
    body,
    o.tema ?? 'claro',
  );
}

/** Pacote de estudo de um tópico: por que importa + formulário + anotações + exercícios. */
export function topicIntroMd(topic: Topic, mastery: number, formula: Note | undefined, notes: Note[]): string {
  const pts = fmt(SUBJECT_POINTS[topic.subject]);
  const valor = topic.subject === 'mat' || topic.subject === 'fis' ? 'cada questão vale 2,5 pontos (edital, item 8.1.2)' : topic.subject === 'red' ? 'a redação vale 37 dos 100 pontos' : 'cada questão vale 1 ponto';
  const parts = [
    `## Por que isso importa`,
    `${SUBJECT_NAMES[topic.subject]} vale **${pts} pts** na nota final; ${valor}. Frequência nas provas: **${topic.frequency}/5**${topic.source && topic.source !== 'estimativa pelo programa' ? ` (${topic.source})` : ''}. Seu domínio hoje: **${mastery}/5**.`,
  ];
  if (formula?.body.trim()) parts.push(`## Formulário`, formula.body.replace(/^> Esqueleto gerado pelo app.*$/m, '').trim());
  for (const n of notes) if (n.body.trim()) parts.push(`## ${n.title || 'Suas anotações'}`, n.body.trim());
  if (!formula && !notes.length) parts.push(`> [!dica]`, `> Você ainda não tem anotações deste tópico. Escreva um resumo em Anotações (ou peça um material completo ao Claude com a skill Go, Julls!) e gere este PDF de novo.`);
  return parts.join('\n\n');
}
