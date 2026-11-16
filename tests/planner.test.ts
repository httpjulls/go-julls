import { describe, it, expect } from 'vitest';
import { planDay, splitMinutes, topicValue, type PlannerInput, type PlannerTopic } from '../src/core/planner';
import { seedTopics } from '../src/data/seed';
import { addDays } from '../src/core/dates';

const topics: PlannerTopic[] = seedTopics().map((t) => ({ id: t.id, subject: t.subject, name: t.name, frequency: t.frequency, mastery: 0 }));
const base = (over: Partial<PlannerInput> = {}): PlannerInput => ({
  today: '2026-11-16',
  examDate: '2026-12-06',
  minutesToday: 150,
  topics,
  subjectLastStudied: {},
  essayLastWritten: null,
  recentMock: false,
  ...over,
});

describe('splitMinutes', () => {
  it('blocos entre 25 e 50 minutos', () => {
    for (const m of [25, 40, 60, 75, 90, 120, 150, 200, 240, 300]) {
      const parts = splitMinutes(m);
      for (const p of parts) {
        expect(p).toBeGreaterThanOrEqual(25);
        expect(p).toBeLessThanOrEqual(50);
      }
      const sum = parts.reduce((a, b) => a + b, 0);
      expect(sum).toBeLessThanOrEqual(m);
      expect(m - sum).toBeLessThan(25);
    }
  });
});

describe('planDay', () => {
  it('é determinístico (função pura)', () => {
    expect(planDay(base())).toEqual(planDay(base()));
  });
  it('preenche as horas do dia sem estourar', () => {
    const p = planDay(base());
    const total = p.blocks.reduce((s, b) => s + b.minutes, 0);
    expect(total).toBeLessThanOrEqual(150);
    expect(150 - total).toBeLessThan(25);
    expect(p.blocks.length).toBeGreaterThanOrEqual(2);
  });
  it('começa com redação quando nunca treinou e traz Matemática e Física', () => {
    const p = planDay(base());
    expect(p.blocks[0].kind).toBe('essay');
    const subs = p.blocks.map((b) => b.subject);
    expect(subs).toContain('mat');
    expect(subs).toContain('fis');
  });
  it('cada bloco explica o porquê (pontos, domínio, frequência)', () => {
    const p = planDay(base({ essayLastWritten: '2026-11-15' }));
    const b = p.blocks.find((x) => x.subject === 'fis')!;
    expect(b.reason).toMatch(/Física · .+ · vale 15 pts · domínio 0\/5 · cai/);
  });
  it('alterna disciplinas quando há alternativa', () => {
    const p = planDay(base({ minutesToday: 240, essayLastWritten: '2026-11-15' }));
    for (let i = 1; i < p.blocks.length; i++) expect(p.blocks[i].subject).not.toBe(p.blocks[i - 1].subject);
  });
  it('prioriza tópicos que caem muito e domínio baixo', () => {
    const v1 = topicValue({ id: 'a', subject: 'fis', name: 'x', frequency: 5, mastery: 1 }, 18, '2026-11-16', false).value;
    const v2 = topicValue({ id: 'b', subject: 'fis', name: 'y', frequency: 2, mastery: 1 }, 18, '2026-11-16', false).value;
    const v3 = topicValue({ id: 'c', subject: 'fis', name: 'z', frequency: 5, mastery: 4 }, 18, '2026-11-16', false).value;
    expect(v1).toBeGreaterThan(v2);
    expect(v1).toBeGreaterThan(v3);
  });
  it('bônus de revisão: erros recentes, domínio que caiu e tópico parado', () => {
    const t = { id: 'a', subject: 'mat' as const, name: 'x', frequency: 3, mastery: 3 };
    const v = topicValue(t, 17, '2026-11-16', false).value;
    expect(topicValue({ ...t, recentErrors: 2 }, 17, '2026-11-16', false).value).toBeGreaterThan(v);
    expect(topicValue({ ...t, masteryDropped: true }, 17, '2026-11-16', false).value).toBeGreaterThan(v);
    expect(topicValue({ ...t, lastStudied: '2026-11-01' }, 17, '2026-11-16', false).value).toBeGreaterThan(v);
  });
  it('piso: Física entra mesmo se Matemática valer mais naquele dia', () => {
    const ts = topics.map((t) => (t.subject === 'fis' ? { ...t, mastery: 4 } : t));
    const p = planDay(base({ topics: ts, minutesToday: 75, essayLastWritten: '2026-11-15', subjectLastStudied: { fis: '2026-11-10', mat: '2026-11-15' } }));
    expect(p.blocks.some((b) => b.subject === 'fis' && /piso/.test(b.reason))).toBe(true);
  });
  it('dia perdido não vira dívida: plano depende só do estado atual e das horas do dia', () => {
    const a = planDay(base({ today: '2026-11-18', essayLastWritten: '2026-11-17' }));
    expect(a.blocks.reduce((s, b) => s + b.minutes, 0)).toBeLessThanOrEqual(150);
  });
  it('última semana: simulado e menos conteúdo novo', () => {
    const p = planDay(base({ today: addDays('2026-12-06', -6), minutesToday: 240, essayLastWritten: addDays('2026-12-06', -7) }));
    expect(p.phase).toBe('final-week');
    expect(p.blocks.some((b) => b.kind === 'mock')).toBe(true);
    const nv = topicValue({ id: 'n', subject: 'mat', name: 'x', frequency: 5, mastery: 0 }, 17, '2026-12-01', true).value;
    const nn = topicValue({ id: 'n', subject: 'mat', name: 'x', frequency: 5, mastery: 0 }, 17, '2026-12-01', false).value;
    expect(nv).toBeLessThan(nn);
  });
  it('véspera: revisão leve; dia da prova e depois: sem blocos', () => {
    const ts = topics.map((t) => ({ ...t, mastery: 3 }));
    const eve = planDay(base({ today: '2026-12-05', topics: ts }));
    expect(eve.phase).toBe('eve');
    expect(eve.blocks.length).toBeGreaterThan(0);
    expect(eve.blocks.every((b) => b.kind === 'light' && b.minutes <= 25)).toBe(true);
    expect(planDay(base({ today: '2026-12-06' })).blocks).toHaveLength(0);
    expect(planDay(base({ today: '2026-12-07' })).phase).toBe('after');
  });
  it('dia sem horas = descanso', () => {
    expect(planDay(base({ minutesToday: 0 })).phase).toBe('rest');
  });
  it('rotação curta de disciplinas de peso menor quando o dia tem tempo', () => {
    const p = planDay(base({ minutesToday: 180, essayLastWritten: '2026-11-15' }));
    const last = p.blocks[p.blocks.length - 1];
    expect(['bio', 'qui', 'geo', 'his', 'lem']).toContain(last.subject);
    expect(last.minutes).toBe(25);
  });
});
