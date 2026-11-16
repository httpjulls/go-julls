import type { SubjectId } from '../core/exam';
import type { DayKey } from '../core/dates';
import type { BlockKind } from '../core/planner';
import type { PlannerParams } from '../core/planner';
import type { Grade } from '../core/sm2';

/** Campos comuns a todo registro sincronizável. */
export interface SyncRow {
  id: string; // UUID gerado no cliente (ou id determinístico do seed)
  updated_at: string; // ISO 8601 UTC
  device_id: string;
  deleted?: boolean; // exclusão lógica (propaga entre aparelhos)
}

export type Letter = 'A' | 'B' | 'C' | 'D';
export type ErrorReason = 'conceito' | 'calculo' | 'interpretacao' | 'distracao';
export type TopicStatus = 'pendente' | 'estudando' | 'revisado' | 'dominado';

export interface Settings extends SyncRow {
  examDate: DayKey;
  /** minutos por dia da semana (0 = domingo) */
  minutesByWeekday: number[];
  foreignLanguage: 'ingles' | 'espanhol';
  onboarded: boolean;
  theme: 'dark' | 'light';
  reminderTimes: string[]; // "HH:MM"
  remindersOn: boolean;
  inscriptionConfirmed: boolean;
  pomodoroWork: number;
  pomodoroBreak: number;
  plannerParams?: Partial<PlannerParams>;
  charsPerLine: number;
  weeklyGoalMinutes: number;
  weeklyGoalQuestions: number;
  studentMode: boolean;
  student?: StudentConfig;
}

export interface StudentConfig {
  /** fórmula configurável da média: pesos por componente (ex.: AD1, AD2, AP1, AP2) */
  components: { key: string; label: string; weight: number }[];
  passGrade: number | null; // média mínima para aprovação — preencher conforme o regulamento
  notes: string; // onde ela anota o regulamento
}

export interface Subject extends SyncRow {
  id: SubjectId;
  name: string;
  points: number;
  order: number;
}

export interface Topic extends SyncRow {
  subject: SubjectId;
  name: string;
  frequency: number; // 1–5
  status: TopicStatus;
  order: number;
  active: boolean;
  custom?: boolean;
  /** observação sobre a origem/conferência do tópico */
  source?: string;
}

export interface StudySession extends SyncRow {
  topicId: string | null;
  subject: SubjectId;
  day: DayKey;
  startedAt: string;
  minutes: number;
  kind: BlockKind | 'free' | 'flashcards' | 'questions';
  planItemId?: string;
  correct?: number;
  wrong?: number;
}

export interface MasteryLog extends SyncRow {
  topicId: string;
  subject: SubjectId;
  mastery: number; // 0–5
  day: DayKey;
  at: string;
  source: 'onboarding' | 'block' | 'manual';
}

export interface ErrorLog extends SyncRow {
  topicId: string | null;
  subject: SubjectId;
  reason: ErrorReason;
  note: string;
  questionId?: string;
  day: DayKey;
  at: string;
}

export interface Question extends SyncRow {
  subject: SubjectId;
  topicId: string | null;
  statement: string;
  options: Record<Letter, string>;
  answer: Letter;
  solution: string;
  source: string;
}

export interface QuestionAttempt extends SyncRow {
  questionId: string;
  subject: SubjectId;
  topicId: string | null;
  chosen: Letter | null;
  correct: boolean;
  seconds: number;
  day: DayKey;
  at: string;
  mockId?: string;
}

export interface Flashcard extends SyncRow {
  subject: SubjectId;
  topicId: string | null;
  front: string;
  back: string;
  created: DayKey;
}

export interface FlashcardReview extends SyncRow {
  cardId: string;
  grade: Grade;
  day: DayKey;
  at: string;
}

export interface Note extends SyncRow {
  kind: 'note' | 'formula';
  subject: SubjectId | null;
  topicId: string | null;
  title: string;
  body: string; // Markdown
  attachments: string[];
}

export interface Essay extends SyncRow {
  themeId: string | null;
  theme: string;
  text: string;
  lines: number;
  minutes: number;
  day: DayKey;
  scores: { formais: number; textuais: number; discursivos: number } | null;
  checklist: Record<string, boolean>;
  zeroFlags: string[];
}

export interface EssayTheme extends SyncRow {
  title: string;
  axis: string;
  notes: string;
  used: boolean;
}

export interface Repertoire extends SyncRow {
  kind: 'citacao' | 'dado' | 'fato' | 'obra';
  text: string;
  source: string;
  axis: string;
}

export interface MockExam extends SyncRow {
  day: DayKey;
  startedAt: string;
  finishedAt: string | null;
  noCalc: boolean;
  /** questão sorteada por posição (0..44) — null quando não havia questão no banco */
  slots: { subject: SubjectId; questionId: string | null }[];
  answers: (Letter | null)[];
  essayId: string | null;
  essayScore: number | null;
  result: {
    n1: number;
    n2: number | null;
    nf: number;
    eliminated: boolean;
    reasons: string[];
    bySubject: { subject: SubjectId; correct: number; total: number; points: number }[];
  } | null;
}

export interface Goal extends SyncRow {
  weekStart: DayKey;
  minutes: number;
  questions: number;
}

export interface PlanItem extends SyncRow {
  day: DayKey;
  index: number;
  topicId: string | null;
  subject: SubjectId;
  minutes: number;
  kind: BlockKind;
  title: string;
  reason: string;
  done: boolean;
  sessionId?: string;
}

export interface StudentCourse extends SyncRow {
  name: string;
  period: string;
  grades: Record<string, number | null>;
}

export interface StudentEvent extends SyncRow {
  courseId: string | null;
  title: string;
  date: DayKey;
  type: 'AD' | 'AP' | 'outro';
  done: boolean;
}

export interface Achievement extends SyncRow {
  key: string;
  day: DayKey;
}

/** Tabelas locais e no Supabase. As append-only nunca são sobrescritas. */
export const MUTABLE_TABLES = [
  'settings',
  'subjects',
  'topics',
  'plan_items',
  'questions',
  'flashcards',
  'notes',
  'essays',
  'essay_themes',
  'repertoire',
  'mock_exams',
  'goals',
  'student_courses',
  'student_events',
] as const;

export const APPEND_ONLY_TABLES = [
  'study_sessions',
  'mastery_log',
  'error_log',
  'question_attempts',
  'flashcard_reviews',
  'achievements',
] as const;

export const SYNC_TABLES = [...MUTABLE_TABLES, ...APPEND_ONLY_TABLES] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];
export const isAppendOnly = (t: SyncTable) => (APPEND_ONLY_TABLES as readonly string[]).includes(t);
