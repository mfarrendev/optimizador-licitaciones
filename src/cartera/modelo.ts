import type { Equipo, Licitacion, Mochila } from "../tipos.ts";

/** Ganancia esperada de postular: monto x margen x probabilidad de adjudicar. */
export function gananciaEsperada(l: Licitacion): number {
  return l.monto * l.margen * l.probabilidad;
}

export function cumpleHabilidades(l: Licitacion, e: Equipo): boolean {
  const disponibles = new Set(e.habilidades);
  return l.habilidades.every((h) => disponibles.has(h));
}

/**
 * Traduce cartera + equipo a una mochila multidimensional.
 *
 * Las licitaciones que piden una habilidad que el equipo no tiene se descartan
 * antes de optimizar (x_i = 0 fijo), así que no aparecen como ítems. Cada
 * semana del horizonte es una restricción: las horas de una licitación se
 * reparten en partes iguales en las semanas de preparación previas a su cierre
 * (incluida la de cierre). Una semana sin carga de ningún ítem se omite.
 */
export function construirMochila(
  licitaciones: Licitacion[],
  equipo: Equipo,
): { mochila: Mochila; indices: number[] } {
  const indices: number[] = [];
  licitaciones.forEach((l, i) => {
    if (cumpleHabilidades(l, equipo)) indices.push(i);
  });
  const semanas = equipo.capacidadSemanal.length;
  const carga: number[][] = Array.from({ length: semanas }, () => new Array<number>(indices.length).fill(0));
  indices.forEach((orig, j) => {
    const l = licitaciones[orig]!;
    const desde = Math.max(0, l.semanaCierre - l.semanasPreparacion + 1);
    const hasta = Math.min(semanas - 1, l.semanaCierre);
    const n = hasta - desde + 1;
    if (n <= 0) throw new Error(`La licitación ${l.id} cierra fuera del horizonte`);
    for (let s = desde; s <= hasta; s++) carga[s]![j] = l.horas / n;
  });
  const peso: number[][] = [];
  const capacidad: number[] = [];
  carga.forEach((fila, s) => {
    if (fila.some((h) => h > 0)) {
      peso.push(fila);
      capacidad.push(equipo.capacidadSemanal[s]!);
    }
  });
  return {
    mochila: { valor: indices.map((i) => gananciaEsperada(licitaciones[i]!)), peso, capacidad },
    indices,
  };
}

/** Tolerancia para comparar sumas de horas en punto flotante. */
export const EPS = 1e-9;

export function esFactible(m: Mochila, elegidos: Iterable<number>): boolean {
  const uso = new Array<number>(m.capacidad.length).fill(0);
  for (const i of elegidos) for (let k = 0; k < uso.length; k++) uso[k]! += m.peso[k]![i]!;
  return uso.every((u, k) => u <= m.capacidad[k]! + EPS);
}

export function valorDe(m: Mochila, elegidos: Iterable<number>): number {
  let v = 0;
  for (const i of elegidos) v += m.valor[i]!;
  return v;
}
