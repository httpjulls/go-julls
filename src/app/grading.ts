/**
 * Correção de simulado/prova/lista: grava tentativas, manda as erradas para o banco de erros
 * e calcula a nota pelas regras do edital. Usada pelo simulado no app e pela correção
 * "pelo número" de provas e listas feitas no papel.
 */
import { repo, nowIso } from '../db/repo';
import type { ErrorLog, ErrorReason, Letter, MockExam, Question, QuestionAttempt } from '../db/types';
import { EXAM_ORDER, scoreExam, type ObjectiveResult } from '../core/exam';
import { dayKey } from '../core/dates';

/** Resposta de uma posição: a letra marcada (corrige pelo gabarito) ou só certo/errado. */
export interface SlotMark {
  chosen?: Letter | null;
  correct?: boolean | null;
  reason?: ErrorReason;
}

export function isCorrect(q: Question, m: SlotMark | undefined): boolean | null {
  if (!m) return null;
  if (m.chosen) return m.chosen === q.answer;
  if (m.correct === true || m.correct === false) return m.correct;
  return null;
}

export async function gradeMock(mock: MockExam, qs: Map<string, Question>, marks: (SlotMark | undefined)[]) {
  const label = mock.title ?? (mock.kind === 'lista' ? 'Lista' : 'Simulado');
  const results: ObjectiveResult[] = [];
  const day = dayKey();
  let wrong = 0;
  for (const { subject } of EXAM_ORDER) {
    let correct = 0;
    let total = 0;
    for (const [i, s] of mock.slots.entries()) {
      if (s.subject !== subject || !s.questionId) continue;
      const q = qs.get(s.questionId);
      if (!q) continue;
      const ok = isCorrect(q, marks[i]);
      if (ok === null) continue; // não respondida/não corrigida
      total++;
      if (ok) correct++;
      await repo.append<QuestionAttempt>('question_attempts', {
        id: `att-${mock.id}-${i}`,
        questionId: q.id,
        subject: q.subject,
        topicId: q.topicId,
        chosen: marks[i]?.chosen ?? null,
        correct: ok,
        seconds: 0,
        day,
        at: nowIso(),
        mockId: mock.id,
      });
      if (!ok) {
        wrong++;
        await repo.append<ErrorLog>('error_log', {
          id: `err-${mock.id}-${i}`,
          subject: q.subject,
          topicId: q.topicId,
          reason: marks[i]?.reason ?? 'conceito',
          note: `Errou a questão ${i + 1} de "${label}"${q.number && !q.examId?.startsWith('material-') && q.number !== i + 1 ? ` (nº ${q.number} no caderno)` : ''}${marks[i]?.chosen ? ` · marcou ${marks[i]!.chosen}, gabarito ${q.answer}` : ''}.`,
          questionId: q.id,
          day,
          at: nowIso(),
        });
      }
    }
    if (total) results.push({ subject, correct, total });
  }
  const r = scoreExam(results, mock.essayScore);
  const answered = results.reduce((s, x) => s + x.total, 0);
  const reasons = [...r.reasons];
  if (answered < 45 && mock.kind !== 'lista') reasons.push('Parcial: só as questões respondidas/corrigidas entraram na nota.');
  if (r.eliminated && results.some((x) => x.correct === 0 && x.total < 6)) reasons.push('Com menos de 6 questões numa disciplina, o “zero” pode não refletir a prova real.');
  await repo.update<MockExam>('mock_exams', mock.id, {
    finishedAt: new Date().toISOString(),
    answers: mock.slots.map((_, i) => marks[i]?.chosen ?? mock.answers[i] ?? null),
    result: { n1: r.n1, n2: r.n2, nf: r.nf, eliminated: r.eliminated, reasons, bySubject: r.bySubject },
  });
  return { answered, wrong, result: r };
}
