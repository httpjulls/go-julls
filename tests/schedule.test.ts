import { describe, it, expect } from 'vitest';
import { buildSchedule, minutesBySubject } from '../src/core/schedule';
import { seedTopics } from '../src/data/seed';

const topics = seedTopics().map((t) => ({ id: t.id, subject: t.subject, name: t.name, frequency: t.frequency, mastery: 1 }));
const base = {
  from: '2026-11-18',
  examDate: '2026-12-06',
  minutesByWeekday: [120, 90, 90, 90, 90, 90, 150],
  topics,
  subjectLastStudied: {},
  essayLastWritten: null,
  recentMock: false,
};

describe('cronograma até a prova', () => {
  const days = buildSchedule(base);
  it('vai de hoje até o dia da prova', () => {
    expect(days[0].day).toBe('2026-11-18');
    expect(days[days.length - 1].day).toBe('2026-12-06');
    expect(days[days.length - 1].phase).toBe('exam-day');
    expect(days[days.length - 2].phase).toBe('eve');
  });
  it('não repete o mesmo tópico de conteúdo novo todos os dias', () => {
    const first = days.slice(0, 5).flatMap((d) => d.blocks.filter((b) => b.topicId).map((b) => b.topicId));
    expect(new Set(first).size).toBeGreaterThan(first.length / 2);
  });
  it('Matemática, Física e Redação aparecem toda semana', () => {
    for (let w = 0; w + 7 <= days.length - 2; w += 7) {
      const subs = new Set(days.slice(w, w + 7).flatMap((d) => d.blocks.map((b) => b.subject)));
      expect(subs.has('mat')).toBe(true);
      expect(subs.has('fis')).toBe(true);
      expect(subs.has('red')).toBe(true);
    }
  });
  it('tem um simulado na última semana e respeita as horas de cada dia', () => {
    expect(days.some((d) => d.blocks.some((b) => b.kind === 'mock'))).toBe(true);
    for (const d of days) expect(d.blocks.reduce((s, b) => s + b.minutes, 0)).toBeLessThanOrEqual(150);
    const m = minutesBySubject(days);
    expect((m.mat ?? 0) + (m.fis ?? 0)).toBeGreaterThan(m.bio ?? 0);
  });
  it('usa o plano já salvo para o primeiro dia', () => {
    const custom = { ...days[0], headline: 'X', blocks: [] };
    expect(buildSchedule({ ...base, firstDayPlan: custom })[0]).toBe(custom);
  });
});
