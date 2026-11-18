import { describe, it, expect } from 'vitest';
import { MATERIALS, materialForTopic, materialQuestions, parseMaterial, theoryOnly } from '../src/data/materials';
import { seedTopics } from '../src/data/seed';

const sample = `---
titulo: Teste
disciplina: Física
frequencia: 5
topicos: fis-hidrostatica, fis-pressao
---

## O essencial
> [!formula] Stevin
> p = p₀ + ρgh

## Exercícios

**1.** Quanto é 2 + 2?

(A) 3
(B) 4
(C) 5
(D) 6

**2.** Texto com (parênteses) no meio
e duas linhas?

(A) a
(B) b b
(C) c
(D) d

## Gabarito

**1. B** — 2 + 2 = 4.
**2. D** — porque sim.
`;

describe('biblioteca de materiais', () => {
  it('lê frontmatter, tópicos cobertos e disciplina', () => {
    const m = parseMaterial('fis-hidrostatica', sample);
    expect(m.titulo).toBe('Teste');
    expect(m.topicos).toEqual(['fis-hidrostatica', 'fis-pressao']);
    expect(m.subject).toBe('fis');
    expect(m.frequencia).toBe(5);
  });
  it('extrai exercícios com alternativas e gabarito com resolução', () => {
    const qs = materialQuestions(parseMaterial('x', sample).body);
    expect(qs).toHaveLength(2);
    expect(qs[0]).toMatchObject({ number: 1, answer: 'B', solution: '2 + 2 = 4.' });
    expect(qs[0].options).toEqual({ A: '3', B: '4', C: '5', D: '6' });
    expect(qs[1].statement).toContain('(parênteses)');
    expect(qs[1].options.B).toBe('b b');
    expect(qs[1].answer).toBe('D');
  });
  it('teoria sem exercícios e gabarito', () => {
    const t = theoryOnly(parseMaterial('x', sample).body);
    expect(t).toContain('Stevin');
    expect(t).not.toContain('Gabarito');
    expect(t).not.toContain('Quanto é');
  });
  it('materiais embutidos: ids batem com o seed e todos têm exercícios com gabarito completo', () => {
    const ids = new Set(seedTopics().map((t) => t.id));
    for (const m of MATERIALS) {
      expect(ids.has(m.id), m.id).toBe(true);
      for (const t of m.topicos) expect(ids.has(t), `${m.id} → ${t}`).toBe(true);
      const qs = materialQuestions(m.body);
      expect(qs.length, `${m.id}: exercícios`).toBeGreaterThan(0);
      for (const q of qs) {
        expect(q.answer, `${m.id} questão ${q.number}: gabarito`).not.toBeNull();
        for (const L of ['A', 'B', 'C', 'D'] as const) expect(q.options[L], `${m.id} q${q.number} ${L}`).toBeTruthy();
      }
    }
  });
  it('encontra material por tópico coberto', () => {
    if (!MATERIALS.some((m) => m.id === 'fis-hidrostatica')) return;
    expect(materialForTopic('fis-pressao')?.id).toBe('fis-hidrostatica');
  });
});
