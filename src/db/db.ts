import Dexie, { type Table } from 'dexie';
import type {
  Settings, Subject, Topic, StudySession, MasteryLog, ErrorLog, Question, QuestionAttempt, Flashcard,
  FlashcardReview, Note, Essay, EssayTheme, Repertoire, MockExam, Goal, PlanItem, StudentCourse,
  StudentEvent, Achievement, SyncTable,
} from './types';

export interface OutboxEntry {
  key: string; // `${table}:${id}`
  table: SyncTable;
  id: string;
  updated_at: string; // versão enfileirada
  attempts: number;
}

export interface MetaEntry { key: string; value: unknown }

export interface Attachment {
  id: string;
  dataUrl: string; // JPEG comprimido
  uploaded: boolean;
  created: string;
}

export class GoDb extends Dexie {
  settings!: Table<Settings, string>;
  subjects!: Table<Subject, string>;
  topics!: Table<Topic, string>;
  study_sessions!: Table<StudySession, string>;
  mastery_log!: Table<MasteryLog, string>;
  error_log!: Table<ErrorLog, string>;
  questions!: Table<Question, string>;
  question_attempts!: Table<QuestionAttempt, string>;
  flashcards!: Table<Flashcard, string>;
  flashcard_reviews!: Table<FlashcardReview, string>;
  notes!: Table<Note, string>;
  essays!: Table<Essay, string>;
  essay_themes!: Table<EssayTheme, string>;
  repertoire!: Table<Repertoire, string>;
  mock_exams!: Table<MockExam, string>;
  goals!: Table<Goal, string>;
  plan_items!: Table<PlanItem, string>;
  student_courses!: Table<StudentCourse, string>;
  student_events!: Table<StudentEvent, string>;
  achievements!: Table<Achievement, string>;
  outbox!: Table<OutboxEntry, string>;
  meta!: Table<MetaEntry, string>;
  attachments!: Table<Attachment, string>;

  constructor(name = 'gojulls') {
    super(name);
    this.version(1).stores({
      settings: 'id',
      subjects: 'id',
      topics: 'id, subject',
      study_sessions: 'id, day, subject, topicId',
      mastery_log: 'id, topicId, subject, at',
      error_log: 'id, topicId, subject, day',
      questions: 'id, subject, topicId',
      question_attempts: 'id, questionId, subject, topicId, day',
      flashcards: 'id, subject, topicId',
      flashcard_reviews: 'id, cardId, day',
      notes: 'id, kind, subject, topicId',
      essays: 'id, day',
      essay_themes: 'id',
      repertoire: 'id, kind',
      mock_exams: 'id, day',
      goals: 'id, weekStart',
      plan_items: 'id, day',
      student_courses: 'id',
      student_events: 'id, date',
      achievements: 'id, key',
      outbox: 'key, table',
      meta: 'key',
      attachments: 'id',
    });
  }

  table_(name: SyncTable): Table<any, string> {
    return this.table(name);
  }
}

export const db = new GoDb();
