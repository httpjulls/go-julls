import { describe, it, expect } from 'vitest';
import { review, replay, NEW_CARD } from '../src/core/sm2';
import { countLines, lineStatus } from '../src/core/lines';

describe('SM-2 simplificado', () => {
  it('acertos aumentam o intervalo; erro volta para 1 dia', () => {
    let s = NEW_CARD('2026-11-16');
    s = review(s, 2, '2026-11-16');
    expect(s.interval).toBe(1);
    expect(s.due).toBe('2026-11-17');
    s = review(s, 2, '2026-11-17');
    expect(s.interval).toBe(6);
    s = review(s, 2, '2026-11-23');
    expect(s.interval).toBeGreaterThan(6);
    const e = review(s, 0, '2026-12-01');
    expect(e.interval).toBe(1);
    expect(e.reps).toBe(0);
    expect(e.ease).toBeLessThan(s.ease);
  });
  it('ease nunca fica abaixo de 1,3 e intervalo máximo 30', () => {
    let s = NEW_CARD('2026-11-16');
    for (let i = 0; i < 10; i++) s = review(s, 0, '2026-11-16');
    expect(s.ease).toBe(1.3);
    let g = NEW_CARD('2026-11-16');
    for (let i = 0; i < 10; i++) g = review(g, 3, '2026-11-16');
    expect(g.interval).toBeLessThanOrEqual(30);
  });
  it('replay reconstrói o estado do histórico, em qualquer ordem', () => {
    const r = [
      { day: '2026-11-17', grade: 2 as const },
      { day: '2026-11-16', grade: 2 as const },
    ];
    expect(replay('2026-11-16', r)).toEqual(review(review(NEW_CARD('2026-11-16'), 2, '2026-11-16'), 2, '2026-11-17'));
  });
});

describe('contador de linhas da redação', () => {
  it('conta parágrafos e quebras pela largura', () => {
    expect(countLines('')).toBe(0);
    expect(countLines('Olá')).toBe(1);
    expect(countLines('a '.repeat(60).trim(), 78)).toBe(2);
    expect(countLines('um\n\ndois\ntrês')).toBe(3);
  });
  it('alertas aos 20 e aos 25', () => {
    expect(lineStatus(19)).toBe('curta');
    expect(lineStatus(20)).toBe('ok');
    expect(lineStatus(25)).toBe('limite');
    expect(lineStatus(26)).toBe('excedeu');
  });
});
