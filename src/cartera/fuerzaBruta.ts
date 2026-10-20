import type { Mochila, Solucion } from "../tipos.ts";
import { esFactible, valorDe } from "./modelo.ts";

/** Enumera los 2^n subconjuntos. Solo para validar en instancias de n <= 20. */
export function fuerzaBruta(m: Mochila): Solucion {
  const n = m.valor.length;
  if (n > 20) throw new Error("Fuerza bruta limitada a n <= 20");
  let mejor: Solucion = { elegidos: [], valor: 0 };
  for (let mask = 0; mask < 1 << n; mask++) {
    const sel: number[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) sel.push(i);
    if (!esFactible(m, sel)) continue;
    const v = valorDe(m, sel);
    if (v > mejor.valor) mejor = { elegidos: sel, valor: v };
  }
  return mejor;
}
