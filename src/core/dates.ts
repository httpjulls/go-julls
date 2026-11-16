/** Datas locais no formato YYYY-MM-DD (sem fuso: o dia é o dia do aparelho). */
export type DayKey = string;

export function dayKey(d: Date = new Date()): DayKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function parseDay(k: DayKey): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(k: DayKey, n: number): DayKey {
  const d = parseDay(k);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** Dias inteiros de `from` até `to` (to − from). */
export function diffDays(from: DayKey, to: DayKey): number {
  const a = parseDay(from).getTime();
  const b = parseDay(to).getTime();
  return Math.round((b - a) / 86400000);
}

/** 0 = domingo … 6 = sábado */
export function weekday(k: DayKey): number {
  return parseDay(k).getDay();
}

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function formatDay(k: DayKey, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' }): string {
  return parseDay(k).toLocaleDateString('pt-BR', opts);
}

export function formatMinutes(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`;
}

/** Início da semana (segunda-feira) que contém o dia. */
export function weekStart(k: DayKey): DayKey {
  const wd = weekday(k);
  return addDays(k, wd === 0 ? -6 : 1 - wd);
}
