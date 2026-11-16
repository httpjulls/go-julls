import { describe, it, expect } from 'vitest';
import { projectScore, assessRisks, masteryToP } from '../src/core/projection';
import { seedTopics } from '../src/data/seed';

const topics = (m: number) => seedTopics().map((t) => ({ subject: t.subject, frequency: t.frequency, mastery: m }));

describe('projeção de nota', () => {
  it('domínio 0 ≈ chute (25%)', () => {
    const p = projectScore(topics(0));
    expect(masteryToP(0)).toBe(0.25);
    expect(p.n1).toBeCloseTo(63 * 0.25, 5);
    expect(p.essayLikelyCorrected).toBe(false);
  });
  it('domínio 5 ≈ 95%', () => {
    const p = projectScore(topics(5), [], 80);
    expect(p.n1).toBeCloseTo(63 * 0.95, 5);
    expect(p.essayLikelyCorrected).toBe(true);
    expect(p.nf).toBe(Math.floor((p.n1 + 80 * 0.37) * 100) / 100);
  });
  it('usa a taxa real de acertos quando há tentativas suficientes', () => {
    const a = projectScore(topics(1), [{ subject: 'mat', attempts: 60, correct: 54 }]);
    const b = projectScore(topics(1));
    expect(a.subjects.find((s) => s.subject === 'mat')!.pCorrect).toBeGreaterThan(b.subjects.find((s) => s.subject === 'mat')!.pCorrect);
  });
  it('painel de risco: domínio baixo nas eliminatórias, corte de 31 e redação', () => {
    const p = projectScore(topics(0));
    const risks = assessRisks({ projection: p, masteryBySubject: { por: 0, mat: 0, fis: 0 }, daysSinceEssay: Infinity, inscriptionConfirmed: false });
    expect(risks.map((r) => r.id)).toEqual(expect.arrayContaining(['zero-por', 'zero-mat', 'zero-fis', 'corte-31', 'redacao-semana', 'inscricao']));
    const ok = assessRisks({ projection: projectScore(topics(4), [], 70), masteryBySubject: { por: 4, mat: 4, fis: 4 }, daysSinceEssay: 2, inscriptionConfirmed: true });
    expect(ok).toHaveLength(0);
  });
});
