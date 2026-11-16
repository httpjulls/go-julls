import { describe, it, expect } from 'vitest';
import { parseQuestion } from '../src/core/parseQuestion';
import { neededGrade, weightedAverage } from '../src/core/student';
import { ELEMENTS, electronConfig, valence } from '../src/data/periodic';
import { seedTopics, seedSubjects } from '../src/data/seed';
import { seedFormulaNotes } from '../src/data/formulas';
import { isNewer } from '../src/native/update';
import { GoDb } from '../src/db/db';
import { Repo } from '../src/db/repo';
import { ensureSeed } from '../src/db/state';
import { exportJson, importJson } from '../src/db/backup';

describe('colar questão', () => {
  it('separa enunciado, alternativas e gabarito', () => {
    const p = parseQuestion('Quanto é 2+2?\nConsidere a) a soma.\n(A) 3\n(B) 4\nque é par\n(C) 5\n(D) 6\nGabarito: b');
    expect(p.statement).toBe('Quanto é 2+2?\nConsidere a) a soma.');
    expect(p.options).toEqual({ A: '3', B: '4 que é par', C: '5', D: '6' });
    expect(p.answer).toBe('B');
  });
  it('aceita formato A) e a.', () => {
    const p = parseQuestion('Enunciado\nA) um\nb. dois\nC) três\nD - quatro');
    expect(p.options.D).toBe('quatro');
    expect(p.options.B).toBe('dois');
    expect(p.answer).toBeNull();
  });
});

describe('modo aluna (fórmula configurável)', () => {
  const comps = [
    { key: 'ad', label: 'AD', weight: 2 },
    { key: 'ap', label: 'AP', weight: 8 },
  ];
  it('média ponderada e nota necessária', () => {
    expect(weightedAverage(comps, { ad: 8, ap: 5 })).toBeCloseTo(5.6);
    expect(neededGrade(comps, { ad: 8, ap: null }, 'ap', 6)).toBeCloseTo(5.5);
    expect(neededGrade(comps, { ad: null, ap: null }, 'ap', 6)).toBeNull();
  });
});

describe('dados', () => {
  it('tabela periódica com 118 elementos e posições únicas', () => {
    expect(ELEMENTS).toHaveLength(118);
    const pos = new Set(ELEMENTS.map((e) => `${e.row}-${e.col}`));
    expect(pos.size).toBe(118);
    expect(ELEMENTS.find((e) => e.symbol === 'Fe')).toMatchObject({ z: 26, group: 8, period: 4 });
    expect(ELEMENTS.find((e) => e.symbol === 'Au')).toMatchObject({ z: 79, group: 11, period: 6 });
    expect(electronConfig(11)).toBe('1s² 2s² 2p⁶ 3s¹');
    expect(valence(17)).toEqual({ shell: 3, electrons: 7 });
  });
  it('seed: ids únicos, todas as disciplinas, frequência 1–5, formulário ligado a tópicos reais', () => {
    const t = seedTopics();
    expect(new Set(t.map((x) => x.id)).size).toBe(t.length);
    expect(seedSubjects()).toHaveLength(9);
    for (const x of t) expect(x.frequency).toBeGreaterThanOrEqual(1);
    const ids = new Set(t.map((x) => x.id));
    for (const f of seedFormulaNotes()) expect(ids.has(f.topicId!)).toBe(true);
    expect(t.filter((x) => x.subject === 'mat')).toHaveLength(17);
    expect(t.filter((x) => x.subject === 'fis')).toHaveLength(18);
  });
  it('compara versões', () => {
    expect(isNewer('1.0.1', '1.0.0')).toBe(true);
    expect(isNewer('v1.2.0', '1.10.0')).toBe(false);
    expect(isNewer('1.0.0', '1.0.0')).toBe(false);
  });
});

describe('backup', () => {
  it('exporta e importa em outro aparelho sem duplicar', async () => {
    const a = new GoDb('bk-a');
    await ensureSeed(a);
    const ra = new Repo(a);
    await ra.update('topics', 'mat-funcoes', { frequency: 4 } as never);
    await ra.append('study_sessions', { topicId: 'mat-funcoes', subject: 'mat', day: '2026-11-16', startedAt: '2026-11-16T10:00:00.000Z', minutes: 30, kind: 'study' } as never);
    const json = await exportJson(a);
    const b = new GoDb('bk-b');
    await ensureSeed(b);
    const r1 = await importJson(b, json);
    expect(r1.applied).toBeGreaterThan(0);
    expect((await b.topics.get('mat-funcoes'))!.frequency).toBe(4);
    expect(await b.study_sessions.count()).toBe(1);
    await importJson(b, json);
    expect(await b.study_sessions.count()).toBe(1);
  });
});
