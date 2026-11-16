import { db } from '../db/db';
import { repo, nowIso } from '../db/repo';
import type { MasteryLog, PlanItem, StudySession, Topic } from '../db/types';
import type { SubjectId } from '../core/exam';
import type { BlockKind } from '../core/planner';
import { dayKey, weekday } from '../core/dates';
import { buildPlan, planItemsFromPlan, type Snapshot } from '../db/state';

export const CHEERS = [
  'Bloco concluído. Go, Julls!',
  'Mais um! Cada bloco é ponto na prova.',
  'Feito. Constância ganha vestibular.',
  'Boa! Engenharia de Produção te esperando.',
  'Check! Respira, bebe água e segue.',
  'Isso aí. Um passo de cada vez.',
];
export const cheer = () => CHEERS[Math.floor(Math.random() * CHEERS.length)];

export interface CompleteArgs {
  topicId: string | null;
  subject: SubjectId;
  minutes: number;
  kind: BlockKind | 'free' | 'flashcards' | 'questions';
  startedAt?: string;
  planItemId?: string;
  correct?: number;
  wrong?: number;
  mastery?: number | null;
}

/** Registra uma sessão de estudo (+ domínio novo e item do plano concluído). */
export async function completeStudy(a: CompleteArgs) {
  const day = dayKey();
  const session = await repo.append<StudySession>('study_sessions', {
    topicId: a.topicId,
    subject: a.subject,
    day,
    startedAt: a.startedAt ?? new Date(Date.now() - a.minutes * 60000).toISOString(),
    minutes: Math.max(1, Math.round(a.minutes)),
    kind: a.kind,
    planItemId: a.planItemId,
    correct: a.correct || undefined,
    wrong: a.wrong || undefined,
  });
  if (a.topicId && a.mastery !== undefined && a.mastery !== null) {
    await repo.append<MasteryLog>('mastery_log', { topicId: a.topicId, subject: a.subject, mastery: a.mastery, day, at: nowIso(), source: 'block' });
  }
  if (a.topicId) {
    const t = await db.topics.get(a.topicId);
    if (t) {
      const status = a.mastery === 5 ? 'dominado' : t.status === 'pendente' ? 'estudando' : t.status;
      if (status !== t.status) await repo.update<Topic>('topics', t.id, { status });
    }
  }
  if (a.planItemId) await repo.update<PlanItem>('plan_items', a.planItemId, { done: true, sessionId: session.id });
  return session;
}

/** Gera o plano do dia; com force, refaz só os blocos não concluídos (descontando o tempo já feito). */
export async function generatePlan(s: Snapshot, force = false) {
  const today = dayKey();
  const existing = (await db.plan_items.where('day').equals(today).toArray()).filter((p) => !p.deleted);
  if (existing.length && !force) return;
  const done = existing.filter((e) => e.done);
  for (const e of existing) if (!e.done) await repo.remove('plan_items', e.id);
  const dayMinutes = s.settings.minutesByWeekday[weekday(today)] ?? 0;
  const left = Math.max(0, dayMinutes - done.reduce((sum, e) => sum + e.minutes, 0));
  const plan = buildPlan(s, today, force ? left : undefined);
  const start = existing.length ? Math.max(...existing.map((e) => e.index)) + 1 : 0;
  const items = planItemsFromPlan(plan, await repo.getDeviceId(), nowIso(), start);
  for (const it of items) await repo.put<PlanItem>('plan_items', it);
}
