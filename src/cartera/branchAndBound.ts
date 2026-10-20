import type { Mochila, Solucion } from "../tipos.ts";
import { greedy, ordenPorEficiencia } from "./greedy.ts";
import { EPS } from "./modelo.ts";

export interface OpcionesBB {
  /** Tope de nodos explorados; al alcanzarlo devuelve la mejor solución con optimo=false. */
  maxNodos?: number;
}

export interface ResultadoBB extends Solucion {
  /** true si la búsqueda terminó: la solución es óptima probada. */
  optimo: boolean;
  nodos: number;
}

/**
 * Branch and bound exacto para la mochila multidimensional 0-1.
 *
 * Cota superior: para cada restricción k por separado se resuelve la
 * relajación lineal de la mochila de UNA dimensión (algoritmo de Dantzig:
 * ítems por valor/peso_k descendente, el último fraccionado) sobre los ítems
 * aún no decididos y la capacidad restante. Cada una es una cota válida del
 * problema completo, porque soltar las otras restricciones solo agranda la
 * región factible; se usa la menor. Es más floja que la relajación lineal
 * conjunta (que pediría un simplex), pero cuesta O(m n) por nodo y no
 * necesita dependencias.
 *
 * Ramificación en profundidad, primero "incluir", siguiendo el orden de
 * eficiencia agregada; la incumbente inicial es el greedy.
 */
export function branchAndBound(m: Mochila, o: OpcionesBB = {}): ResultadoBB {
  const n = m.valor.length;
  const dims = m.capacidad.length;
  const maxNodos = o.maxNodos ?? Infinity;
  const orden = ordenPorEficiencia(m);
  // pos[i]: profundidad en que se decide el ítem i.
  const pos = new Array<number>(n);
  orden.forEach((i, d) => (pos[i] = d));
  // Por dimensión, ítems por valor/peso_k descendente (peso 0 primero).
  const porDim = Array.from({ length: dims }, (_, k) =>
    Array.from({ length: n }, (_, i) => i).sort((a, b) => ratio(b, k) - ratio(a, k) || a - b),
  );
  function ratio(i: number, k: number): number {
    const w = m.peso[k]![i]!;
    return w <= 0 ? Infinity : m.valor[i]! / w;
  }

  const inicial = greedy(m);
  let mejorValor = inicial.valor;
  let mejor = new Set(inicial.elegidos);
  const actual = new Set<number>();
  const resto = [...m.capacidad];
  let nodos = 0;
  let cortado = false;

  function cota(d: number, valor: number): number {
    let mejorCota = Infinity;
    for (let k = 0; k < dims; k++) {
      let cap = resto[k]!;
      let v = valor;
      for (const i of porDim[k]!) {
        if (pos[i]! < d) continue;
        const w = m.peso[k]![i]!;
        if (w <= cap) {
          cap -= w;
          v += m.valor[i]!;
        } else {
          v += (m.valor[i]! * cap) / w;
          break;
        }
      }
      if (v < mejorCota) mejorCota = v;
      if (mejorCota <= mejorValor + EPS) return mejorCota;
    }
    return mejorCota;
  }

  function explorar(d: number, valor: number): void {
    if (cortado) return;
    if (++nodos > maxNodos) {
      cortado = true;
      return;
    }
    if (valor > mejorValor + EPS) {
      mejorValor = valor;
      mejor = new Set(actual);
    }
    if (d === n) return;
    if (cota(d, valor) <= mejorValor + EPS) return;
    const i = orden[d]!;
    let cabe = true;
    for (let k = 0; k < dims; k++) if (m.peso[k]![i]! > resto[k]! + EPS) cabe = false;
    if (cabe) {
      for (let k = 0; k < dims; k++) resto[k]! -= m.peso[k]![i]!;
      actual.add(i);
      explorar(d + 1, valor + m.valor[i]!);
      actual.delete(i);
      for (let k = 0; k < dims; k++) resto[k]! += m.peso[k]![i]!;
    }
    explorar(d + 1, valor);
  }

  explorar(0, 0);
  return { elegidos: [...mejor].sort((a, b) => a - b), valor: mejorValor, optimo: !cortado, nodos: Math.min(nodos, maxNodos) };
}
