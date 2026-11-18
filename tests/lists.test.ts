import { describe, it, expect } from 'vitest';
import { db } from '../src/db/db';
import { repo } from '../src/db/repo';
import type { MockExam, Question } from '../src/db/types';
import { gradeMock, isCorrect } from '../src/app/grading';
import { buildListDoc, topicIntroMd } from '../src/pdf/generators';
import { seedTopics } from '../src/data/seed';

const q = (n: number, subject: Question['subject'], answer: Question['answer']): Question => ({
  id: `q-teste-${n}`,
  subject,
  topicId: subject === 'fis' ? 'fis-circuitos' : null,
  statement: `Questão ${n}: quanto vale?`,
  options: { A: '1', B: '2', C: '3', D: '4' },
  answer,
  solution: n === 1 ? 'Porque sim.' : '',
  source: 'teste',
  examId: 'teste',
  examName: 'Prova teste',
  number: n,
  updated_at: '2026-11-18T10:00:00.000Z',
  device_id: 'x',
});

describe('correção pelo número', () => {
  it('certo/errado e letra marcada; erradas viram banco de erros sem duplicar', async () => {
    const qs = [q(1, 'fis', 'B'), q(2, 'mat', 'C'), q(3, 'por', 'A')];
    for (const x of qs) await db.questions.put(x);
    const mock = await repo.put<MockExam>('mock_exams', {
      kind: 'lista',
      title: 'Lista teste',
      day: '2026-11-18',
      startedAt: '2026-11-18T10:00:00.000Z',
      finishedAt: null,
      noCalc: true,
      slots: qs.map((x) => ({ subject: x.subject, questionId: x.id })),
      answers: [null, null, null],
      essayId: null,
      essayScore: null,
      result: null,
    });
    const map = new Map(qs.map((x) => [x.id, x]));
    expect(isCorrect(qs[0], { chosen: 'B' })).toBe(true);
    expect(isCorrect(qs[0], { correct: false })).toBe(false);
    expect(isCorrect(qs[0], undefined)).toBeNull();

    const { wrong, answered } = await gradeMock(mock, map, [{ correct: false, reason: 'calculo' }, { chosen: 'C' }, { chosen: 'D' }]);
    expect(answered).toBe(3);
    expect(wrong).toBe(2);
    const errs = (await db.error_log.toArray()).filter((e) => e.note.includes('Lista teste'));
    expect(errs).toHaveLength(2);
    expect(errs.find((e) => e.questionId === 'q-teste-1')!.reason).toBe('calculo');
    expect(errs.find((e) => e.questionId === 'q-teste-1')!.topicId).toBe('fis-circuitos');
    expect(errs.find((e) => e.questionId === 'q-teste-3')!.note).toMatch(/questão 3 .*marcou D, gabarito A/);
    const saved = (await db.mock_exams.get(mock.id))!;
    expect(saved.finishedAt).toBeTruthy();
    expect(saved.result!.bySubject.find((s) => s.subject === 'mat')!.correct).toBe(1);

    // corrigir de novo não duplica tentativas nem erros (ids determinísticos)
    await gradeMock(mock, map, [{ correct: false }, { chosen: 'C' }, { chosen: 'D' }]);
    expect((await db.error_log.toArray()).filter((e) => e.note.includes('Lista teste'))).toHaveLength(2);
    expect((await db.question_attempts.toArray()).filter((a) => a.mockId === mock.id)).toHaveLength(3);
  });
});

describe('PDF de lista no estilo Go, Julls!', () => {
  const qs = [q(1, 'fis', 'B'), q(2, 'fis', 'D')];
  it('tem capa, questões, cartão-resposta e gabarito com resolução', () => {
    const html = buildListDoc({ titulo: 'Lista: circuitos', subject: 'fis', questions: qs, images: new Map(), answerCard: true });
    expect(html).toContain('class="capa"');
    expect(html).toContain('Lista: circuitos');
    expect(html).toContain('15 pts');
    expect(html).toContain('Questão 1: quanto vale?');
    expect(html).toContain('Cartão-resposta');
    expect(html).toMatch(/<h2 class="quebra">Gabarito<\/h2>/);
    expect(html).toContain('<span>2 <b>D</b></span>');
    expect(html).toContain('Porque sim.');
    expect(html).toContain('@font-face');
  });
  it('pacote de tópico sem questões não mostra exercícios vazios', () => {
    const topic = seedTopics().find((t) => t.id === 'fis-circuitos')!;
    const intro = topicIntroMd(topic, 2, undefined, []);
    expect(intro).toMatch(/Física vale \*\*15 pts\*\*/);
    const html = buildListDoc({ titulo: 'Estudo', subject: 'fis', questions: [], images: new Map(), introMd: intro, answerCard: true });
    expect(html).not.toContain('Cartão-resposta');
    expect(html).not.toContain('>Gabarito<');
    expect(html).toContain('Sem questões deste tópico');
  });
});
