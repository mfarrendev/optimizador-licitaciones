import { Prng } from "../prng.ts";
import type { Mochila, Solucion } from "../tipos.ts";
import { greedy, ordenPorEficiencia } from "./greedy.ts";
import { EPS } from "./modelo.ts";

export interface OpcionesRecocido {
  semilla?: number;
  iteraciones?: number;
  /** Temperatura inicial relativa al valor medio de un ítem. */
  temperaturaInicial?: number;
  /** Temperatura final relativa (la razón de enfriamiento sale de ambas). */
  temperaturaFinal?: number;
}

/**
 * Recocido simulado sobre soluciones siempre factibles.
 *
 * Vecindario: se elige un ítem al azar. Si está dentro, se saca. Si está
 * fuera, se mete y, mientras alguna restricción se exceda, se sacan ítems
 * elegidos al azar (sin tocar el recién metido): un movimiento de
 * intercambio que mantiene la factibilidad sin penalizaciones que calibrar.
 * Se acepta con el criterio de Metropolis y enfriamiento geométrico. Parte
 * del greedy y, al final, rellena la mejor solución con lo que todavía quepa.
 */
export function recocido(m: Mochila, o: OpcionesRecocido = {}): Solucion {
  const n = m.valor.length;
  const dims = m.capacidad.length;
  if (n === 0) return { elegidos: [], valor: 0 };
  const r = new Prng(o.semilla ?? 1);
  const iter = o.iteraciones ?? 20_000 + 400 * n;
  const escala = m.valor.reduce((a, b) => a + b, 0) / n;
  let t = (o.temperaturaInicial ?? 2) * escala;
  const tFin = (o.temperaturaFinal ?? 0.001) * escala;
  const alfa = Math.pow(tFin / t, 1 / iter);

  const dentro = new Array<boolean>(n).fill(false);
  const resto = [...m.capacidad];
  let valor = 0;
  for (const i of greedy(m).elegidos) poner(i);
  let mejorValor = valor;
  let mejor = dentro.slice();

  function poner(i: number): void {
    dentro[i] = true;
    valor += m.valor[i]!;
    for (let k = 0; k < dims; k++) resto[k]! -= m.peso[k]![i]!;
  }
  function quitar(i: number): void {
    dentro[i] = false;
    valor -= m.valor[i]!;
    for (let k = 0; k < dims; k++) resto[k]! += m.peso[k]![i]!;
  }
  const excedido = () => resto.some((x) => x < -EPS);

  for (let it = 0; it < iter; it++, t *= alfa) {
    const i = r.entero(0, n - 1);
    const antes = valor;
    const cambios: Array<[number, boolean]> = [];
    if (dentro[i]) {
      quitar(i);
      cambios.push([i, false]);
    } else {
      poner(i);
      cambios.push([i, true]);
      while (excedido()) {
        const candidatos: number[] = [];
        for (let j = 0; j < n; j++) if (dentro[j] && j !== i) candidatos.push(j);
        if (candidatos.length === 0) break;
        const j = candidatos[r.entero(0, candidatos.length - 1)]!;
        quitar(j);
        cambios.push([j, false]);
      }
    }
    const delta = valor - antes;
    const acepta = !excedido() && (delta >= 0 || r.siguiente() < Math.exp(delta / t));
    if (!acepta) {
      for (let c = cambios.length - 1; c >= 0; c--) {
        const [j, puso] = cambios[c]!;
        if (puso) quitar(j);
        else poner(j);
      }
    } else if (valor > mejorValor + EPS) {
      mejorValor = valor;
      mejor = dentro.slice();
    }
  }

  // Relleno final de la mejor solución.
  dentro.forEach((d, i) => d && quitar(i));
  mejor.forEach((d, i) => d && poner(i));
  for (const i of ordenPorEficiencia(m)) {
    if (!dentro[i] && resto.every((x, k) => m.peso[k]![i]! <= x + EPS)) poner(i);
  }
  const elegidos: number[] = [];
  dentro.forEach((d, i) => d && elegidos.push(i));
  return { elegidos, valor };
}
