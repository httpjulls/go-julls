/**
 * Planejador adaptativo ("Norte"). Função pura: mesma entrada → mesmo plano.
 * O plano de cada dia é recalculado a partir do estado atual, então dias perdidos não viram dívida.
 */
import { SUBJECT_POINTS, SUBJECT_SHORT, fmt, type SubjectId } from './exam';
import { diffDays, type DayKey } from './dates';

export interface PlannerTopic {
  id: string;
  subject: SubjectId;
  name: string;
  frequency: number; // 1–5
  mastery: number; // 0–5 (estado atual, derivado do histórico)
  masteryDropped?: boolean; // último registro de domínio foi menor que o anterior
  lastStudied?: DayKey | null;
  recentErrors?: number; // erros nos últimos 14 dias
  active?: boolean;
}

export interface PlannerParams {
  minBlock: number;
  maxBlock: number;
  staleDays: number;
  staleBonus: number;
  errorBonusPer: number;
  errorBonusMax: number;
  dropBonus: number;
  /** máximo de dias sem a disciplina antes de virar bloco obrigatório */
  floorDays: Partial<Record<SubjectId, number>>;
  essayEveryDays: number;
  essayMinutes: number;
  finalWeekDays: number;
  newContentFinalWeek: number;
  reviewBoostFinalWeek: number;
  /** blocos máximos por disciplina no mesmo dia */
  dailyCap: Partial<Record<SubjectId, number>>;
  rotationMinMinutes: number;
  rotationMinutes: number;
}

export const DEFAULT_PARAMS: PlannerParams = {
  minBlock: 25,
  maxBlock: 50,
  staleDays: 7,
  staleBonus: 0.3,
  errorBonusPer: 0.15,
  errorBonusMax: 0.6,
  dropBonus: 0.4,
  floorDays: { mat: 3, fis: 3, por: 5 },
  essayEveryDays: 3,
  essayMinutes: 60,
  finalWeekDays: 7,
  newContentFinalWeek: 0.4,
  reviewBoostFinalWeek: 1.3,
  dailyCap: { mat: 2, fis: 2, red: 1, por: 1, bio: 1, qui: 1, geo: 1, his: 1, lem: 1 },
  rotationMinMinutes: 100,
  rotationMinutes: 25,
};

export const ROTATING: SubjectId[] = ['bio', 'qui', 'geo', 'his', 'lem'];

export type BlockKind = 'study' | 'review' | 'essay' | 'mock' | 'light';
export type Phase = 'normal' | 'final-week' | 'eve' | 'exam-day' | 'after' | 'rest';

export interface PlanBlock {
  topicId: string | null;
  subject: SubjectId;
  minutes: number;
  kind: BlockKind;
  title: string;
  reason: string;
  value: number;
}

export interface DayPlan {
  day: DayKey;
  daysLeft: number;
  phase: Phase;
  headline: string;
  blocks: PlanBlock[];
}

export interface PlannerInput {
  today: DayKey;
  examDate: DayKey;
  minutesToday: number;
  topics: PlannerTopic[];
  /** último dia com sessão de estudo por disciplina */
  subjectLastStudied: Partial<Record<SubjectId, DayKey | null>>;
  essayLastWritten: DayKey | null;
  /** já fez simulado completo nos últimos 10 dias? */
  recentMock: boolean;
  params?: Partial<PlannerParams>;
}

const FREQ_LABEL = ['', 'cai raramente', 'cai pouco', 'cai às vezes', 'cai bastante', 'cai muito'];

function daysSince(today: DayKey, d?: DayKey | null): number {
  return d ? diffDays(d, today) : Infinity;
}

export interface TopicValue {
  value: number;
  notes: string[];
}

/** Valor de um tópico ≈ (pontos/n_tópicos) × frequência × (1 − domínio/5) + bônus de revisão. */
export function topicValue(
  t: PlannerTopic,
  nTopicsInSubject: number,
  today: DayKey,
  finalWeek: boolean,
  p: PlannerParams = DEFAULT_PARAMS,
): TopicValue {
  const notes: string[] = [];
  const base = (SUBJECT_POINTS[t.subject] / Math.max(1, nTopicsInSubject)) * clamp(t.frequency, 1, 5);
  let factor = 1 - clamp(t.mastery, 0, 5) / 5;
  const since = daysSince(today, t.lastStudied);
  if (t.lastStudied && since >= p.staleDays && t.mastery > 0) {
    factor += p.staleBonus;
    notes.push(`sem revisão há ${since} dias`);
  }
  const errs = t.recentErrors ?? 0;
  if (errs > 0) {
    factor += Math.min(p.errorBonusMax, errs * p.errorBonusPer);
    notes.push(errs === 1 ? '1 erro recente' : `${errs} erros recentes`);
  }
  if (t.masteryDropped) {
    factor += p.dropBonus;
    notes.push('domínio caiu');
  }
  let value = base * factor;
  if (finalWeek) {
    const isNew = !t.lastStudied && t.mastery <= 1;
    if (isNew) value *= p.newContentFinalWeek;
    else if (t.mastery >= 2 && t.mastery <= 4) value *= p.reviewBoostFinalWeek;
  }
  return { value, notes };
}

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}

function reasonFor(t: PlannerTopic, notes: string[], extra?: string): string {
  const parts = [
    SUBJECT_SHORT[t.subject],
    t.name,
    `vale ${fmt(SUBJECT_POINTS[t.subject])} pts`,
    `domínio ${t.mastery}/5`,
    FREQ_LABEL[clamp(Math.round(t.frequency), 1, 5)],
    ...notes,
  ];
  if (extra) parts.push(extra);
  return parts.join(' · ');
}

/** Divide os minutos do dia em tamanhos de bloco entre minBlock e maxBlock. */
export function splitMinutes(total: number, p: PlannerParams = DEFAULT_PARAMS): number[] {
  const out: number[] = [];
  let rem = Math.floor(total);
  while (rem >= p.minBlock) {
    let size: number;
    if (rem >= p.maxBlock + p.minBlock) size = p.maxBlock;
    else if (rem > p.maxBlock) size = Math.ceil(rem / 2);
    else size = rem;
    // arredonda para múltiplos de 5 sem sair dos limites
    size = clamp(Math.round(size / 5) * 5, p.minBlock, p.maxBlock);
    if (size > rem) size = rem;
    out.push(size);
    rem -= size;
  }
  return out;
}

export function planDay(input: PlannerInput): DayPlan {
  const p: PlannerParams = {
    ...DEFAULT_PARAMS,
    ...input.params,
    floorDays: { ...DEFAULT_PARAMS.floorDays, ...input.params?.floorDays },
    dailyCap: { ...DEFAULT_PARAMS.dailyCap, ...input.params?.dailyCap },
  };
  const { today, examDate } = input;
  const daysLeft = diffDays(today, examDate);
  const base = { day: today, daysLeft };

  if (daysLeft < 0) return { ...base, phase: 'after', headline: 'A prova passou. Orgulho de você, Julls!', blocks: [] };
  if (daysLeft === 0) return { ...base, phase: 'exam-day', headline: 'Dia de prova! Respira, confia e Go, Julls!', blocks: [] };

  const topics = input.topics.filter((t) => t.active !== false);
  const nBySubject = new Map<SubjectId, number>();
  for (const t of topics) nBySubject.set(t.subject, (nBySubject.get(t.subject) ?? 0) + 1);

  const finalWeek = daysLeft <= p.finalWeekDays;

  if (daysLeft === 1) {
    // Véspera: revisão leve e descanso.
    const light = topics
      .filter((t) => (t.subject === 'mat' || t.subject === 'fis' || t.subject === 'red') && t.mastery >= 2)
      .sort((a, b) => b.frequency - a.frequency || b.mastery - a.mastery || a.id.localeCompare(b.id))
      .slice(0, input.minutesToday >= 50 ? 2 : input.minutesToday >= 25 ? 1 : 0);
    return {
      ...base,
      phase: 'eve',
      headline: 'Véspera: revisão leve, separa documento e caneta, dorme cedo.',
      blocks: light.map((t) => ({
        topicId: t.id,
        subject: t.subject,
        minutes: 25,
        kind: 'light' as const,
        title: `Revisão leve: ${t.name}`,
        reason: `${SUBJECT_SHORT[t.subject]} · ${t.name} · só relembrar fórmulas e o que você já domina`,
        value: 0,
      })),
    };
  }

  if (input.minutesToday < p.minBlock) {
    return {
      ...base,
      phase: 'rest',
      headline: 'Dia sem estudo planejado. Se der, revise 10 flashcards. Descanso também conta.',
      blocks: [],
    };
  }

  const blocks: PlanBlock[] = [];
  let remaining = input.minutesToday;
  const usedTopics = new Set<string>();
  const subjectCount = new Map<SubjectId, number>();
  const bump = (s: SubjectId) => subjectCount.set(s, (subjectCount.get(s) ?? 0) + 1);

  // 1) Simulado na última semana (uma vez, se ainda não fez nenhum recente).
  if (finalWeek && daysLeft >= 3 && daysLeft <= 6 && !input.recentMock && remaining >= 120) {
    const minutes = Math.min(180, remaining);
    blocks.push({
      topicId: null,
      subject: 'red',
      minutes,
      kind: 'mock',
      title: minutes >= 180 ? 'Simulado completo (3h)' : `Simulado parcial (${minutes} min)`,
      reason: 'Última semana: treinar tempo de prova, cartão de respostas e redação juntos',
      value: Infinity,
    });
    remaining -= minutes;
    bump('red');
  }

  // 2) Redação: treino de escrita a cada `essayEveryDays` (piso; vale 37 pts).
  const essayDue = daysSince(today, input.essayLastWritten) >= p.essayEveryDays;
  if (essayDue && !blocks.some((b) => b.kind === 'mock') && remaining >= p.minBlock + 10) {
    // Em dias curtos a redação fica com no máximo metade do tempo (mínimo 40 min).
    const half = Math.max(40, Math.round(input.minutesToday / 2 / 5) * 5);
    const minutes = Math.min(p.essayMinutes, half, remaining);
    const since = daysSince(today, input.essayLastWritten);
    blocks.push({
      topicId: null,
      subject: 'red',
      minutes,
      kind: 'essay',
      title: 'Treino de redação cronometrado',
      reason: `Redação · vale 37 pts · ${since === Infinity ? 'ainda sem redação escrita' : `última há ${since} dias`} · 20 a 25 linhas`,
      value: Infinity,
    });
    remaining -= minutes;
    bump('red');
  }

  const scored = topics.map((t) => {
    const tv = topicValue(t, nBySubject.get(t.subject) ?? 1, today, finalWeek, p);
    return { t, ...tv };
  });
  const byValue = (a: { value: number; t: PlannerTopic }, b: { value: number; t: PlannerTopic }) =>
    b.value - a.value || a.t.id.localeCompare(b.t.id);

  const pushTopic = (t: PlannerTopic, notes: string[], minutes: number, value: number, extra?: string) => {
    const isNew = !t.lastStudied && t.mastery <= 1;
    blocks.push({
      topicId: t.id,
      subject: t.subject,
      minutes,
      kind: isNew ? 'study' : 'review',
      title: `${SUBJECT_SHORT[t.subject]}: ${t.name}`,
      reason: reasonFor(t, notes, extra),
      value,
    });
    usedTopics.add(t.id);
    bump(t.subject);
  };

  const sizes = splitMinutes(remaining, p);

  // 3) Pisos: disciplinas obrigatórias que estão há muitos dias sem estudo.
  const forced: SubjectId[] = (Object.keys(p.floorDays) as SubjectId[])
    .filter((s) => daysSince(today, input.subjectLastStudied[s]) >= (p.floorDays[s] ?? Infinity))
    .filter((s) => !blocks.some((b) => b.subject === s));
  // Rotação de disciplinas de peso menor (bloco curto), se o dia tiver tempo.
  let rotationSubject: SubjectId | null = null;
  if (input.minutesToday >= p.rotationMinMinutes) {
    rotationSubject =
      [...ROTATING]
        .filter((s) => (nBySubject.get(s) ?? 0) > 0)
        .sort((a, b) => {
          const da = daysSince(today, input.subjectLastStudied[a]);
          const db = daysSince(today, input.subjectLastStudied[b]);
          return db - da || SUBJECT_POINTS[b] - SUBJECT_POINTS[a] || a.localeCompare(b);
        })[0] ?? null;
  }

  // Reserva o bloco de rotação (25 min) no fim.
  let rotationSize = 0;
  if (rotationSubject) {
    rotationSize = p.rotationMinutes;
    const total = sizes.reduce((s, x) => s + x, 0) - rotationSize;
    sizes.splice(0, sizes.length, ...splitMinutes(total, p));
  }

  const pickBest = (filter: (t: PlannerTopic) => boolean) =>
    scored.filter((s) => !usedTopics.has(s.t.id) && filter(s.t)).sort(byValue)[0];

  for (const s of forced) {
    if (!sizes.length) break;
    const best = pickBest((t) => t.subject === s);
    if (!best) continue;
    const since = daysSince(today, input.subjectLastStudied[s]);
    pushTopic(best.t, best.notes, sizes.shift()!, best.value, since === Infinity ? 'piso: ainda não estudada' : `piso: ${since} dias sem ${SUBJECT_SHORT[s]}`);
  }

  // 4) Guloso por valor, alternando disciplinas e respeitando o limite diário.
  const decay = new Map<SubjectId, number>();
  while (sizes.length) {
    const last = blocks[blocks.length - 1]?.subject;
    const candidates = scored
      .filter((c) => !usedTopics.has(c.t.id))
      .filter((c) => (subjectCount.get(c.t.subject) ?? 0) < (p.dailyCap[c.t.subject] ?? 1))
      .filter((c) => !ROTATING.includes(c.t.subject) || c.t.subject !== rotationSubject)
      .map((c) => ({ ...c, eff: c.value * (decay.get(c.t.subject) ?? 1) }))
      .sort((a, b) => b.eff - a.eff || a.t.id.localeCompare(b.t.id));
    if (!candidates.length) break;
    const alt = candidates.find((c) => c.t.subject !== last);
    const chosen = alt && alt.eff > 0 ? alt : candidates[0];
    pushTopic(chosen.t, chosen.notes, sizes.shift()!, chosen.value);
    decay.set(chosen.t.subject, (decay.get(chosen.t.subject) ?? 1) * 0.55);
  }

  if (rotationSubject) {
    const best = pickBest((t) => t.subject === rotationSubject);
    if (best) pushTopic(best.t, best.notes, rotationSize, best.value, 'revisão rotativa curta');
  }

  const first = blocks[0];
  const headline = first
    ? finalWeek
      ? `Reta final: ${daysLeft} dias. Mais revisão, menos conteúdo novo. Go, Julls!`
      : `Hoje o foco é ${first.kind === 'essay' ? 'Redação' : first.title}. ${first.minutes} minutos. Go, Julls!`
    : 'Tudo em dia. Que tal flashcards?';

  return { ...base, phase: finalWeek ? 'final-week' : 'normal', headline, blocks };
}
