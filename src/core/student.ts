/**
 * Simulador de média do Modo Aluna. NÃO embute regras da CEDERJ: a fórmula (pesos) e a média de
 * aprovação são configuradas por ela a partir do regulamento oficial.
 */
export interface Component { key: string; label: string; weight: number }

export function weightedAverage(components: Component[], grades: Record<string, number | null>): number | null {
  const known = components.filter((c) => grades[c.key] !== null && grades[c.key] !== undefined);
  const w = known.reduce((s, c) => s + c.weight, 0);
  if (!w) return null;
  return known.reduce((s, c) => s + c.weight * (grades[c.key] as number), 0) / w;
}

/** Nota necessária no componente `missing` para atingir `target`, dado o resto. */
export function neededGrade(components: Component[], grades: Record<string, number | null>, missing: string, target: number): number | null {
  const m = components.find((c) => c.key === missing);
  const totalW = components.reduce((s, c) => s + c.weight, 0);
  if (!m || !m.weight || !totalW) return null;
  const others = components.filter((c) => c.key !== missing);
  if (others.some((c) => grades[c.key] === null || grades[c.key] === undefined)) return null;
  const sum = others.reduce((s, c) => s + c.weight * (grades[c.key] as number), 0);
  return (target * totalW - sum) / m.weight;
}
