/**
 * Projeção de nota — ESTIMATIVA de estudo, não previsão de resultado.
 * Modelo simples e explicável:
 *   p(acerto) por disciplina = 0,25 (chute em 4 alternativas) + 0,70 × domínio_médio/5,
 *   misturado com a taxa real de acertos dela quando houver ≥ 10 tentativas na disciplina.
 *   Domínio médio é ponderado pela frequência do tópico nas provas.
 */
import { EXAM, ELIMINATORY_ZERO, SUBJECT_SHORT, questionValue, trunc2, type SubjectId } from './exam';

export interface ProjectionTopic { subject: SubjectId; frequency: number; mastery: number }
export interface AttemptStats { subject: SubjectId; attempts: number; correct: number }

export interface SubjectProjection {
  subject: SubjectId;
  pCorrect: number;
  expectedCorrect: number;
  expectedPoints: number;
  maxPoints: number;
  pZero: number; // probabilidade de zerar (6 questões independentes)
  avgMastery: number;
}

export interface Projection {
  subjects: SubjectProjection[];
  n1: number;
  n2: number | null;
  nf: number;
  essayLikelyCorrected: boolean;
}

export const OBJECTIVE_SUBJECTS: SubjectId[] = ['por', 'bio', 'fis', 'geo', 'his', 'mat', 'qui', 'lem'];

export function masteryToP(m: number): number {
  return 0.25 + 0.7 * Math.max(0, Math.min(5, m)) / 5;
}

export function weightedMastery(topics: ProjectionTopic[], subject: SubjectId): number {
  const ts = topics.filter((t) => t.subject === subject);
  const w = ts.reduce((s, t) => s + t.frequency, 0);
  if (!w) return 0;
  return ts.reduce((s, t) => s + t.mastery * t.frequency, 0) / w;
}

export function projectScore(
  topics: ProjectionTopic[],
  attempts: AttemptStats[] = [],
  essayScore: number | null = null,
): Projection {
  const subjects = OBJECTIVE_SUBJECTS.map((subject) => {
    const n = subject === 'lem' ? EXAM.foreignQuestions : EXAM.questionsPerSubject;
    const avgMastery = weightedMastery(topics, subject);
    let p = masteryToP(avgMastery);
    const a = attempts.find((x) => x.subject === subject);
    if (a && a.attempts >= 10) {
      const observed = a.correct / a.attempts;
      const w = Math.min(0.7, a.attempts / 60); // quanto mais tentativas, mais peso no real
      p = (1 - w) * p + w * observed;
    }
    const expectedCorrect = p * n;
    const value = questionValue(subject);
    return {
      subject,
      pCorrect: p,
      expectedCorrect,
      expectedPoints: expectedCorrect * value,
      maxPoints: n * value,
      pZero: Math.pow(1 - p, n),
      avgMastery,
    };
  });
  const n1 = subjects.reduce((s, x) => s + x.expectedPoints, 0);
  const essayLikelyCorrected = n1 > EXAM.essayCorrectionThreshold;
  const n2 = essayScore;
  const nf = trunc2(n1 + (essayLikelyCorrected && n2 !== null ? n2 * EXAM.essayFactor : 0));
  return { subjects, n1, n2, nf, essayLikelyCorrected };
}

export type RiskLevel = 'alto' | 'medio';
export interface Risk { id: string; level: RiskLevel; title: string; detail: string }

export interface RiskInput {
  projection: Projection;
  masteryBySubject: Partial<Record<SubjectId, number>>;
  daysSinceEssay: number; // Infinity se nunca
  inscriptionConfirmed: boolean;
}

/** Painel de risco: pisos eliminatórios, corte de 31 pontos e treino de redação. */
export function assessRisks(input: RiskInput): Risk[] {
  const risks: Risk[] = [];
  for (const s of ELIMINATORY_ZERO) {
    const m = input.masteryBySubject[s] ?? 0;
    const sp = input.projection.subjects.find((x) => x.subject === s);
    if (m < 2 || (sp && sp.pZero > 0.05)) {
      risks.push({
        id: `zero-${s}`,
        level: m < 1 ? 'alto' : 'medio',
        title: `${SUBJECT_SHORT[s]} com domínio baixo (${m.toFixed(1)}/5)`,
        detail: `Zero em ${SUBJECT_SHORT[s]} elimina (edital, item 6.3.1). Garanta pelo menos o básico dos tópicos que mais caem.`,
      });
    }
  }
  const n1 = input.projection.n1;
  if (n1 <= EXAM.essayCorrectionThreshold) {
    risks.push({
      id: 'corte-31',
      level: n1 < 25 ? 'alto' : 'medio',
      title: `Projeção das objetivas: ${n1.toFixed(1)}/63`,
      detail: 'A redação só é corrigida com mais de 31 pontos nas objetivas (item 6.3.2), salvo ajuste por polo. Matemática e Física valem 2,5 por questão.',
    });
  }
  if (input.daysSinceEssay >= 7) {
    risks.push({
      id: 'redacao-semana',
      level: 'alto',
      title: input.daysSinceEssay === Infinity ? 'Nenhuma redação treinada ainda' : `Sem redação há ${input.daysSinceEssay} dias`,
      detail: 'Redação vale 37 dos 100 pontos e nota zero elimina (item 6.3.6). Escreva pelo menos uma por semana, entre 20 e 25 linhas.',
    });
  }
  if (!input.inscriptionConfirmed) {
    risks.push({
      id: 'inscricao',
      level: 'medio',
      title: 'Confirme sua inscrição',
      detail: 'O edital prevê confirmação/impressão do Cartão de Confirmação de 30/11 a 04/12/2026. Marque como feito em Configurações.',
    });
  }
  return risks;
}
