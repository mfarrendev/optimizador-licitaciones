import type { Mochila, Solucion } from "../tipos.ts";
import { EPS } from "./modelo.ts";

/**
 * Orden por "eficiencia agregada": valor dividido por el consumo relativo
 * sumado en todas las restricciones. Es la heurística clásica de Senju y
 * Toyoda simplificada; la usan el B&B para ordenar la ramificación y el
 * recocido para reparar soluciones.
 */
export function ordenPorEficiencia(m: Mochila): number[] {
  const n = m.valor.length;
  const ef = Array.from({ length: n }, (_, i) => {
    let c = 0;
    for (let k = 0; k < m.capacidad.length; k++) c += m.peso[k]![i]! / Math.max(m.capacidad[k]!, EPS);
    return c === 0 ? Infinity : m.valor[i]! / c;
  });
  return Array.from({ length: n }, (_, i) => i).sort((a, b) => ef[b]! - ef[a]! || a - b);
}

/** Agrega ítems en orden de eficiencia mientras quepan. */
export function greedy(m: Mochila): Solucion {
  const resto = [...m.capacidad];
  const elegidos: number[] = [];
  let valor = 0;
  for (const i of ordenPorEficiencia(m)) {
    if (resto.every((r, k) => m.peso[k]![i]! <= r + EPS)) {
      resto.forEach((_, k) => (resto[k]! -= m.peso[k]![i]!));
      elegidos.push(i);
      valor += m.valor[i]!;
    }
  }
  return { elegidos: elegidos.sort((a, b) => a - b), valor };
}
