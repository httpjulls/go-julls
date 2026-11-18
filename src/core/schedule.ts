/**
 * Cronograma até a prova: roda o planejador dia a dia, supondo que cada bloco planejado
 * seja cumprido (o tópico estudado ganha domínio e fica "recente"). É uma PREVISÃO:
 * o plano real de cada dia é recalculado a partir do que ela de fato fez.
 */
import { planDay, type DayPlan, type PlannerInput, type PlannerTopic } from './planner';
import { addDays, diffDays, weekday, type DayKey } from './dates';
import type { SubjectId } from './exam';

export interface ScheduleInput extends Omit<PlannerInput, 'today' | 'minutesToday'> {
  from: DayKey;
  minutesByWeekday: number[];
  /** plano já salvo para o dia `from` (mantém o de hoje igual ao da tela Hoje) */
  firstDayPlan?: DayPlan;
}

/** Ganho de domínio assumido por bloco cumprido. */
const GAIN: Record<string, number> = { study: 1, review: 0.5, light: 0, essay: 0, mock: 0 };

export function buildSchedule(input: ScheduleInput): DayPlan[] {
  const days: DayPlan[] = [];
  const topics = new Map<string, PlannerTopic>(input.topics.map((t) => [t.id, { ...t }]));
  const subjectLast: Partial<Record<SubjectId, DayKey | null>> = { ...input.subjectLastStudied };
  let essayLast = input.essayLastWritten;
  let recentMock = input.recentMock;
  const total = diffDays(input.from, input.examDate);

  for (let i = 0; i <= Math.max(0, total); i++) {
    const day = addDays(input.from, i);
    const plan =
      i === 0 && input.firstDayPlan
        ? input.firstDayPlan
        : planDay({
            today: day,
            examDate: input.examDate,
            minutesToday: input.minutesByWeekday[weekday(day)] ?? 0,
            topics: [...topics.values()],
            subjectLastStudied: subjectLast,
            essayLastWritten: essayLast,
            recentMock,
            params: input.params,
          });
    days.push(plan);
    // Supõe o plano cumprido para projetar os próximos dias.
    for (const b of plan.blocks) {
      subjectLast[b.subject] = day;
      if (b.kind === 'essay') essayLast = day;
      if (b.kind === 'mock') {
        recentMock = true;
        essayLast = day;
      }
      if (b.topicId) {
        const t = topics.get(b.topicId);
        if (t) {
          t.lastStudied = day;
          t.mastery = Math.min(5, t.mastery + (GAIN[b.kind] ?? 0));
          t.recentErrors = 0;
          t.masteryDropped = false;
        }
      }
    }
  }
  return days;
}

/** Resumo por disciplina: minutos planejados no período. */
export function minutesBySubject(days: DayPlan[]): Partial<Record<SubjectId, number>> {
  const out: Partial<Record<SubjectId, number>> = {};
  for (const d of days) for (const b of d.blocks) out[b.subject] = (out[b.subject] ?? 0) + b.minutes;
  return out;
}
