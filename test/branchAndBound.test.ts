import { describe, expect, it } from "vitest";
import { branchAndBound } from "../src/cartera/branchAndBound.ts";
import { fuerzaBruta } from "../src/cartera/fuerzaBruta.ts";
import { construirMochila, esFactible, valorDe } from "../src/cartera/modelo.ts";
import { generarCartera, generarMochila } from "../src/generador.ts";

/*
 * Medición de esta prueba (2026-10-20): con la cota multiplicada por 0,9 en
 * branchAndBound.ts (cota inválida, poda de más) cayeron las 3 pruebas: 50 de
 * 200 mochilas aleatorias quedaron bajo el óptimo de fuerza bruta, la cartera
 * de la semilla 1 dio 20115,96 contra 20296,55, y la de tope de nodos terminó
 * antes de 10 nodos. Revertido, 3 de 3 en verde.
 */
describe("branch and bound", () => {
  it("coincide con fuerza bruta en 200 mochilas aleatorias chicas", () => {
    let distintas = 0;
    for (let s = 1; s <= 200; s++) {
      const m = generarMochila(s, 4 + (s % 11), 1 + (s % 4));
      const bb = branchAndBound(m);
      const fb = fuerzaBruta(m);
      expect(bb.optimo).toBe(true);
      expect(esFactible(m, bb.elegidos)).toBe(true);
      expect(valorDe(m, bb.elegidos)).toBeCloseTo(bb.valor, 9);
      if (Math.abs(bb.valor - fb.valor) > 1e-9) distintas++;
    }
    expect(distintas).toBe(0);
  });

  it("coincide con fuerza bruta en carteras sintéticas de licitaciones", () => {
    for (let s = 1; s <= 30; s++) {
      const { licitaciones, equipo } = generarCartera(s, { n: 14, semanas: 6 });
      const { mochila } = construirMochila(licitaciones, equipo);
      expect(branchAndBound(mochila).valor).toBeCloseTo(fuerzaBruta(mochila).valor, 6);
    }
  });

  it("con tope de nodos avisa que no probó optimalidad", () => {
    const m = generarMochila(7, 40, 5);
    const r = branchAndBound(m, { maxNodos: 10 });
    expect(r.optimo).toBe(false);
    expect(esFactible(m, r.elegidos)).toBe(true);
  });
});
