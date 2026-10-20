import { describe, expect, it } from "vitest";
import { branchAndBound } from "../src/cartera/branchAndBound.ts";
import { greedy } from "../src/cartera/greedy.ts";
import { construirMochila, esFactible, valorDe } from "../src/cartera/modelo.ts";
import { recocido } from "../src/cartera/recocido.ts";
import { generarCartera } from "../src/generador.ts";

/*
 * Medición (2026-10-20), dos mutaciones en src/cartera/recocido.ts, cada una
 * revertida después:
 * - sin búsqueda (`const iter = 0`, devuelve el greedy rellenado): cae la
 *   prueba, brecha media 2,80 % contra el tope de 0,5 %.
 * - sin Metropolis (aceptar solo `delta >= 0`): cae, brecha máxima 14,2 %
 *   contra el tope de 2 % (la búsqueda se estanca en un óptimo local).
 * Con la temperatura inicial anterior (0,5) la brecha máxima también era
 * 14,2 %; con 2 el recocido alcanza el óptimo en las 40 instancias.
 */
describe("recocido simulado frente al óptimo exacto", () => {
  it("queda a menos de 0,5 % de brecha media y 2 % de brecha máxima en 40 carteras de 25 licitaciones", { timeout: 60_000 }, () => {
    const brechas: number[] = [];
    let mejoraAlGreedy = 0;
    for (let s = 1; s <= 40; s++) {
      const { licitaciones, equipo } = generarCartera(s, { n: 25 });
      const { mochila } = construirMochila(licitaciones, equipo);
      const exacto = branchAndBound(mochila);
      expect(exacto.optimo).toBe(true);
      const h = recocido(mochila, { semilla: s });
      expect(esFactible(mochila, h.elegidos)).toBe(true);
      expect(valorDe(mochila, h.elegidos)).toBeCloseTo(h.valor, 6);
      expect(h.valor).toBeLessThanOrEqual(exacto.valor + 1e-6);
      brechas.push((exacto.valor - h.valor) / exacto.valor);
      if (h.valor > greedy(mochila).valor + 1e-6) mejoraAlGreedy++;
    }
    const media = brechas.reduce((a, b) => a + b, 0) / brechas.length;
    expect(media).toBeLessThan(0.005);
    expect(Math.max(...brechas)).toBeLessThan(0.02);
    // Que el recocido trabaje: en parte de las instancias supera al greedy inicial.
    expect(mejoraAlGreedy).toBeGreaterThan(0);
  });
});
