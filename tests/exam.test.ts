import { describe, it, expect } from 'vitest';
import { scoreExam, SUBJECT_POINTS, EXAM, EXAM_ORDER, type ObjectiveResult } from '../src/core/exam';

const all = (n: number, lem = 3): ObjectiveResult[] =>
  EXAM_ORDER.map(({ subject, count }) => ({ subject, correct: subject === 'lem' ? Math.min(lem, count) : Math.min(n, count), total: count }));

describe('regras do edital 2027.1 (Eng. de Produção)', () => {
  it('pesos na nota final somam 100', () => {
    const total = Object.values(SUBJECT_POINTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(100, 5);
    expect(SUBJECT_POINTS.red).toBeCloseTo(37);
    expect(SUBJECT_POINTS.mat).toBe(15);
    expect(SUBJECT_POINTS.fis).toBe(15);
    expect(SUBJECT_POINTS.por).toBe(6);
    expect(SUBJECT_POINTS.lem).toBe(3);
  });
  it('45 questões; N1 máximo 63', () => {
    expect(EXAM_ORDER.reduce((s, x) => s + x.count, 0)).toBe(45);
    const r = scoreExam(all(6), 100);
    expect(r.n1).toBe(63);
    expect(r.nf).toBe(100);
  });
  it('NF = N1 + N2 × 0,37, truncada em 2 casas', () => {
    const r = scoreExam(all(4, 2), 73);
    // gerais: por,bio,geo,his,qui = 5×4 = 20 + lem 2 = 22 · específicas 8 × 2,5 = 20 → N1 = 42
    expect(r.n1).toBe(42);
    expect(r.essayCorrected).toBe(true);
    expect(r.nf).toBe(69.01); // 42 + 27,01 (sem erro de ponto flutuante)
  });
  it('zero em Português, Matemática ou Física elimina', () => {
    for (const s of ['por', 'mat', 'fis'] as const) {
      const res = all(6).map((r) => (r.subject === s ? { ...r, correct: 0 } : r));
      const out = scoreExam(res, 80);
      expect(out.eliminated).toBe(true);
      expect(out.essayCorrected).toBe(false);
    }
  });
  it('zero em Biologia não elimina', () => {
    const res = all(6).map((r) => (r.subject === 'bio' ? { ...r, correct: 0 } : r));
    expect(scoreExam(res, 80).eliminated).toBe(false);
  });
  it('redação só é corrigida com objetivas acima de 31', () => {
    // gerais 4×5 = 20 + lem 1 = 21; específicas 4 acertos × 2,5 = 10 → 31 exatos
    const res: ObjectiveResult[] = EXAM_ORDER.map(({ subject, count }) => ({
      subject,
      total: count,
      correct: subject === 'lem' ? 1 : subject === 'mat' || subject === 'fis' ? 2 : 4,
    }));
    const r = scoreExam(res, 90);
    expect(r.n1).toBe(31);
    expect(r.essayCorrected).toBe(false);
    expect(r.n2).toBeNull();
    expect(r.nf).toBe(31);
    expect(EXAM.essayCorrectionThreshold).toBe(31);
  });
  it('nota zero na redação elimina', () => {
    expect(scoreExam(all(5), 0).eliminated).toBe(true);
  });
});
