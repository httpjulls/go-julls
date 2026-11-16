/**
 * Regras da prova — Vestibular CEDERJ 2027.1, Bacharelado em Engenharia de Produção.
 * Fonte: docs/Edital-de-Selecao-2027.1-Final.pdf
 *  - 5.2.1  45 questões A–D, marcação obrigatória (p. 9)
 *  - 5.2.2  Eng. de Produção: específicas = Matemática e Física (p. 9)
 *  - 5.3.2  Redação: máximo 25 linhas (p. 10)
 *  - 5.4.5  Duração máxima de 3 horas (p. 10)
 *  - 6.3.1  Zero em Português ou em qualquer específica elimina (p. 13)
 *  - 6.3.2  Redação só é corrigida se objetivas > 31 pontos (50% de 63) (p. 13)
 *  - 6.3.3/6.3.4  Ajuste por polo: 3 a 5 candidatos por vaga (p. 13)
 *  - 6.3.6  Nota zero na redação elimina (p. 13)
 *  - 8.1.2  33 gerais × 1,0 + 12 específicas × 2,5 (N1 máx. 63) (p. 14)
 *  - 8.2    N2 de 0 a 100: formais 30, textuais 30, discursivos 40 (p. 14)
 *  - 8.2.1  Redação zera com < 20 linhas, fuga ao tema etc. (p. 14–15)
 *  - 8.3    NF = N1 + N2 × 0,37 (p. 15)
 *  - 8.6    Desempate: redação → específicas → Português (p. 15)
 * Distribuição de 6 questões por disciplina e 3 de língua estrangeira: conferida nos
 * cadernos 2026.1 e 2026.2 (o edital não fixa a distribuição por disciplina).
 */

export type SubjectId = 'mat' | 'fis' | 'red' | 'por' | 'bio' | 'qui' | 'geo' | 'his' | 'lem';

export const EXAM = {
  date: '2026-12-06',
  startTime: '10:00',
  durationMin: 180,
  totalQuestions: 45,
  questionsPerSubject: 6,
  foreignQuestions: 3,
  generalValue: 1.0,
  specificValue: 2.5,
  n1Max: 63,
  essayFactor: 0.37,
  essayCorrectionThreshold: 31, // precisa ser SUPERIOR a 31
  essayMinLines: 20,
  essayMaxLines: 25,
  essayCriteria: [
    { key: 'formais', label: 'Aspectos formais', max: 30 },
    { key: 'textuais', label: 'Aspectos textuais', max: 30 },
    { key: 'discursivos', label: 'Aspectos discursivos', max: 40 },
  ],
} as const;

export const SPECIFIC: SubjectId[] = ['mat', 'fis'];
export const ELIMINATORY_ZERO: SubjectId[] = ['por', 'mat', 'fis'];

/** Ordem das questões no caderno (2026.1/2026.2): Port 1–6, Bio 7–12, Fís 13–18, Geo 19–24, Hist 25–30, Mat 31–36, Quím 37–42, LE 43–45. */
export const EXAM_ORDER: { subject: SubjectId; count: number }[] = [
  { subject: 'por', count: 6 },
  { subject: 'bio', count: 6 },
  { subject: 'fis', count: 6 },
  { subject: 'geo', count: 6 },
  { subject: 'his', count: 6 },
  { subject: 'mat', count: 6 },
  { subject: 'qui', count: 6 },
  { subject: 'lem', count: 3 },
];

export function questionValue(subject: SubjectId): number {
  return SPECIFIC.includes(subject) ? EXAM.specificValue : EXAM.generalValue;
}

/** Pontos máximos de cada disciplina na NOTA FINAL (0–100). Redação = 100 × 0,37 = 37. */
export function subjectPoints(subject: SubjectId): number {
  if (subject === 'red') return 100 * EXAM.essayFactor;
  const n = subject === 'lem' ? EXAM.foreignQuestions : EXAM.questionsPerSubject;
  return n * questionValue(subject);
}

export const SUBJECT_POINTS: Record<SubjectId, number> = {
  red: subjectPoints('red'), mat: subjectPoints('mat'), fis: subjectPoints('fis'),
  por: subjectPoints('por'), bio: subjectPoints('bio'), qui: subjectPoints('qui'),
  geo: subjectPoints('geo'), his: subjectPoints('his'), lem: subjectPoints('lem'),
};

export interface ObjectiveResult { subject: SubjectId; correct: number; total: number }

export interface ScoreBreakdown {
  n1: number;
  n2: number | null;
  nf: number;
  essayCorrected: boolean;
  eliminated: boolean;
  reasons: string[];
  bySubject: { subject: SubjectId; correct: number; total: number; points: number }[];
}

/** Trunca em 2 casas (item 8.4: "desprezando-se as demais"). */
export const trunc2 = (x: number) => Math.floor(x * 100 + 1e-9) / 100;

/**
 * Calcula N1, N2 e NF pelas regras do edital. `essay` = N2 (0–100) ou null se não houver redação.
 * Não aplica o ajuste por polo (6.3.3/6.3.4), que depende da concorrência real.
 */
export function scoreExam(results: ObjectiveResult[], essay: number | null): ScoreBreakdown {
  const reasons: string[] = [];
  const bySubject = results.map((r) => ({ ...r, points: r.correct * questionValue(r.subject) }));
  const n1 = bySubject.reduce((s, r) => s + r.points, 0);
  let eliminated = false;
  for (const s of ELIMINATORY_ZERO) {
    const r = results.find((x) => x.subject === s);
    if (r && r.correct === 0) {
      eliminated = true;
      reasons.push(`Zero em ${SUBJECT_NAMES[s]} elimina (item 6.3.1).`);
    }
  }
  const essayCorrected = !eliminated && n1 > EXAM.essayCorrectionThreshold;
  if (!eliminated && !essayCorrected) {
    reasons.push(`Objetivas com ${fmt(n1)} pontos: a redação só é corrigida acima de 31 (item 6.3.2), salvo ajuste por polo.`);
  }
  let n2: number | null = essay;
  if (essay !== null && essay <= 0) {
    eliminated = true;
    reasons.push('Nota zero na redação elimina (item 6.3.6).');
  }
  if (!essayCorrected) n2 = null;
  const nf = trunc2(n1 + (n2 ?? 0) * EXAM.essayFactor);
  return { n1, n2, nf, essayCorrected, eliminated, reasons, bySubject };
}

export const SUBJECT_NAMES: Record<SubjectId, string> = {
  mat: 'Matemática', fis: 'Física', red: 'Redação', por: 'Língua Portuguesa e Literatura',
  bio: 'Biologia', qui: 'Química', geo: 'Geografia', his: 'História', lem: 'Língua estrangeira',
};
export const SUBJECT_SHORT: Record<SubjectId, string> = {
  mat: 'Matemática', fis: 'Física', red: 'Redação', por: 'Português',
  bio: 'Biologia', qui: 'Química', geo: 'Geografia', his: 'História', lem: 'L. estrangeira',
};

export const fmt = (x: number, d = 1) => x.toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: 0 });

/** Marcos do Anexo 1 – Calendário de Atividades (edital 2027.1, p. 29–30). */
export const MILESTONES: { date: string; label: string; end?: string }[] = [
  { date: '2026-10-29', label: 'Encerramento das inscrições (edital)' },
  { date: '2026-11-30', end: '2026-12-04', label: 'Confirmação da inscrição (impressão do Cartão de Confirmação)' },
  { date: '2026-12-06', label: 'PROVA — domingo, 10h, 3 horas' },
  { date: '2026-12-06', end: '2026-12-08', label: 'Recurso sobre o gabarito' },
  { date: '2026-12-15', label: 'Notas da prova de múltipla escolha' },
  { date: '2026-12-21', label: 'Notas da redação' },
  { date: '2026-12-21', end: '2026-12-22', label: 'Pedido de revisão da nota da redação' },
  { date: '2027-01-08', label: 'RESULTADO FINAL' },
  { date: '2027-01-08', end: '2027-01-10', label: 'Matrícula e inscrição em disciplinas (até 22h)' },
  { date: '2027-01-15', label: '1ª reclassificação' },
];
