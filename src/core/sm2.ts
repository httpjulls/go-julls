/** SM-2 simplificado. Notas: 0 = errei, 1 = difícil, 2 = bom, 3 = fácil. */
import { addDays, type DayKey } from './dates';

export type Grade = 0 | 1 | 2 | 3;

export interface CardState {
  ease: number; // fator de facilidade (≥ 1,3)
  interval: number; // dias
  reps: number; // acertos seguidos
  due: DayKey;
}

export const NEW_CARD = (today: DayKey): CardState => ({ ease: 2.5, interval: 0, reps: 0, due: today });

export function review(state: CardState, grade: Grade, today: DayKey): CardState {
  let { ease, interval, reps } = state;
  if (grade === 0) {
    reps = 0;
    interval = 1;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    reps += 1;
    if (reps === 1) interval = grade === 3 ? 3 : 1;
    else if (reps === 2) interval = grade === 1 ? 3 : 6;
    else interval = Math.round(interval * ease * (grade === 1 ? 0.8 : grade === 3 ? 1.3 : 1));
    const q = grade === 1 ? 3 : grade === 2 ? 4 : 5; // escala SM-2 original (0–5)
    ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  }
  // Prova está perto: não deixa o intervalo passar de 30 dias.
  interval = Math.min(30, Math.max(1, interval));
  return { ease: Math.round(ease * 100) / 100, interval, reps, due: addDays(today, interval) };
}

/** Recalcula o estado do cartão a partir do histórico de revisões (append-only). */
export function replay(created: DayKey, reviews: { day: DayKey; grade: Grade }[]): CardState {
  let s = NEW_CARD(created);
  for (const r of [...reviews].sort((a, b) => a.day.localeCompare(b.day))) s = review(s, r.grade, r.day);
  return s;
}
