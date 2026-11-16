/** Estado atual calculado a partir do histórico (append-only) + entrada do planejador. */
import type { GoDb } from './db';
import type { Essay, ErrorLog, MasteryLog, MockExam, PlanItem, QuestionAttempt, Settings, StudySession, Topic } from './types';
import { addDays, dayKey, diffDays, weekday, type DayKey } from '../core/dates';
import { planDay, type DayPlan, type PlannerTopic } from '../core/planner';
import type { SubjectId } from '../core/exam';
import { EXAM } from '../core/exam';
import type { ProjectionTopic, AttemptStats } from '../core/projection';
import { seedSubjects, seedTopics, SEED_STAMP } from '../data/seed';
import { seedFormulaNotes } from '../data/formulas';
import { seedEssayThemes } from '../data/themes';

const alive = <T extends { deleted?: boolean }>(xs: T[]) => xs.filter((x) => !x.deleted);

export const DEFAULT_SETTINGS = (deviceId: string): Settings => ({
  id: 'settings',
  updated_at: SEED_STAMP,
  device_id: deviceId,
  examDate: EXAM.date,
  minutesByWeekday: [120, 90, 90, 90, 90, 90, 150],
  foreignLanguage: 'ingles',
  onboarded: false,
  theme: 'dark',
  reminderTimes: ['19:00'],
  remindersOn: true,
  inscriptionConfirmed: false,
  pomodoroWork: 25,
  pomodoroBreak: 5,
  charsPerLine: 78,
  weeklyGoalMinutes: 600,
  weeklyGoalQuestions: 60,
  studentMode: false,
});

/** Popula o banco local com o seed (ids determinísticos: dois aparelhos geram as mesmas linhas). */
export async function ensureSeed(db: GoDb) {
  if ((await db.subjects.count()) === 0) await db.subjects.bulkPut(seedSubjects());
  if ((await db.topics.count()) === 0) await db.topics.bulkPut(seedTopics());
  if ((await db.notes.where('kind').equals('formula').count()) === 0) await db.notes.bulkPut(seedFormulaNotes());
  if ((await db.essay_themes.count()) === 0) await db.essay_themes.bulkPut(seedEssayThemes());
}

export interface TopicState {
  mastery: number;
  dropped: boolean;
  lastStudied: DayKey | null;
  recentErrors: number;
  minutes: number;
}

export function computeTopicStates(
  topics: Topic[],
  mastery: MasteryLog[],
  sessions: StudySession[],
  errors: ErrorLog[],
  today: DayKey,
): Map<string, TopicState> {
  const map = new Map<string, TopicState>();
  for (const t of topics) map.set(t.id, { mastery: 0, dropped: false, lastStudied: null, recentErrors: 0, minutes: 0 });
  const byTopic = new Map<string, MasteryLog[]>();
  for (const m of mastery) byTopic.set(m.topicId, [...(byTopic.get(m.topicId) ?? []), m]);
  for (const [id, logs] of byTopic) {
    const st = map.get(id);
    if (!st) continue;
    logs.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
    const last = logs[logs.length - 1];
    st.mastery = last.mastery;
    st.dropped = logs.length > 1 && last.mastery < logs[logs.length - 2].mastery;
  }
  for (const s of sessions) {
    if (!s.topicId) continue;
    const st = map.get(s.topicId);
    if (!st) continue;
    st.minutes += s.minutes;
    if (!st.lastStudied || s.day > st.lastStudied) st.lastStudied = s.day;
  }
  for (const e of errors) {
    if (!e.topicId) continue;
    const st = map.get(e.topicId);
    if (st && diffDays(e.day, today) <= 14) st.recentErrors += 1;
  }
  return map;
}

export interface Snapshot {
  settings: Settings;
  topics: Topic[];
  states: Map<string, TopicState>;
  sessions: StudySession[];
  attempts: QuestionAttempt[];
  essays: Essay[];
  mocks: MockExam[];
  errors: ErrorLog[];
}

export async function loadSnapshot(db: GoDb, settings: Settings, today = dayKey()): Promise<Snapshot> {
  const [topics, mastery, sessions, errors, attempts, essays, mocks] = await Promise.all([
    db.topics.toArray(),
    db.mastery_log.toArray(),
    db.study_sessions.toArray(),
    db.error_log.toArray(),
    db.question_attempts.toArray(),
    db.essays.toArray(),
    db.mock_exams.toArray(),
  ]);
  const t = alive(topics);
  return {
    settings,
    topics: t,
    states: computeTopicStates(t, alive(mastery), alive(sessions), alive(errors), today),
    sessions: alive(sessions),
    attempts: alive(attempts),
    essays: alive(essays),
    mocks: alive(mocks),
    errors: alive(errors),
  };
}

export function subjectLastStudied(sessions: StudySession[]): Partial<Record<SubjectId, DayKey>> {
  const out: Partial<Record<SubjectId, DayKey>> = {};
  for (const s of sessions) if (!out[s.subject] || s.day > out[s.subject]!) out[s.subject] = s.day;
  return out;
}

export function lastEssayDay(essays: Essay[]): DayKey | null {
  return essays.reduce<DayKey | null>((m, e) => (!m || e.day > m ? e.day : m), null);
}

export function buildPlan(s: Snapshot, today = dayKey(), minutesOverride?: number): DayPlan {
  const topics: PlannerTopic[] = s.topics.map((t) => {
    const st = s.states.get(t.id)!;
    return {
      id: t.id,
      subject: t.subject,
      name: t.name,
      frequency: t.frequency,
      mastery: st.mastery,
      masteryDropped: st.dropped,
      lastStudied: st.lastStudied,
      recentErrors: st.recentErrors,
      active: t.active,
    };
  });
  const recentMock = s.mocks.some((m) => m.finishedAt && diffDays(m.day, today) <= 10);
  return planDay({
    today,
    examDate: s.settings.examDate,
    minutesToday: minutesOverride ?? s.settings.minutesByWeekday[weekday(today)] ?? 0,
    topics,
    subjectLastStudied: subjectLastStudied(s.sessions),
    essayLastWritten: lastEssayDay(s.essays),
    recentMock,
    params: s.settings.plannerParams,
  });
}

export function projectionInputs(s: Snapshot): { topics: ProjectionTopic[]; attempts: AttemptStats[]; essay: number | null } {
  const topics = s.topics.filter((t) => t.active).map((t) => ({ subject: t.subject, frequency: t.frequency, mastery: s.states.get(t.id)?.mastery ?? 0 }));
  const bySub = new Map<SubjectId, AttemptStats>();
  for (const a of s.attempts) {
    const x = bySub.get(a.subject) ?? { subject: a.subject, attempts: 0, correct: 0 };
    x.attempts += 1;
    if (a.correct) x.correct += 1;
    bySub.set(a.subject, x);
  }
  const graded = s.essays
    .filter((e) => e.scores)
    .sort((a, b) => b.day.localeCompare(a.day) || b.updated_at.localeCompare(a.updated_at))
    .slice(0, 3);
  const essay = graded.length
    ? graded.reduce((sum, e) => sum + e.scores!.formais + e.scores!.textuais + e.scores!.discursivos, 0) / graded.length
    : null;
  return { topics, attempts: [...bySub.values()], essay };
}

/** Plano do dia: usa o salvo (estável durante o dia) ou gera e salva. */
export function planItemsFromPlan(plan: DayPlan, deviceId: string, now: string, startIndex = 0): PlanItem[] {
  return plan.blocks.map((b, j) => ({
    id: `plan-${plan.day}-${startIndex + j}`,
    day: plan.day,
    index: startIndex + j,
    topicId: b.topicId,
    subject: b.subject,
    minutes: b.minutes,
    kind: b.kind,
    title: b.title,
    reason: b.reason,
    done: false,
    updated_at: now,
    device_id: deviceId,
  }));
}

export function streak(sessions: StudySession[], today = dayKey()): number {
  const days = new Set(sessions.map((s) => s.day));
  let n = 0;
  let d = days.has(today) ? today : addDays(today, -1);
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
