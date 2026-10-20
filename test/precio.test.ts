import { describe, expect, it } from "vitest";
import { Prng } from "../src/prng.ts";
import { lambertW, precioOptimo, precioOptimoAnalitico, utilidadEsperada } from "../src/precio/precioOptimo.ts";
import { seccionDorada } from "../src/precio/seccionDorada.ts";

/*
 * Medición (2026-10-20): con la comparación de la sección dorada invertida
 * (`fc < fd`, que busca el mínimo) caen 3 de 4 pruebas. Revertido, 4 de 4.
 */
describe("precio de la oferta", () => {
  it("sección dorada encuentra el máximo de una parábola", () => {
    const r = seccionDorada((x) => -((x - 3.7) ** 2), -10, 10);
    expect(r.x).toBeCloseTo(3.7, 7);
  });

  it("caso cerrado: a = 1, b = -1, costo 0 da p* = 1 + W(1) (la constante omega)", () => {
    expect(lambertW(1)).toBeCloseTo(0.5671432904097838, 14);
    const m = { a: 1, b: -1 };
    expect(precioOptimoAnalitico(m, 0)).toBeCloseTo(1.5671432904097838, 12);
    expect(precioOptimo(m, 0).precio).toBeCloseTo(1.5671432904097838, 6);
  });

  it("coincide con la solución analítica en 300 modelos aleatorios", () => {
    const r = new Prng(2026);
    for (let i = 0; i < 300; i++) {
      const costo = r.uniforme(10, 1000);
      const k = r.uniforme(0.5, 20) / costo; // pendiente relativa al costo
      const a = k * costo * r.uniforme(0.8, 2.5); // punto de indiferencia sobre o bajo el costo
      const m = { a, b: -k };
      const num = precioOptimo(m, costo);
      const ana = precioOptimoAnalitico(m, costo);
      expect(Math.abs(num.precio - ana) / ana).toBeLessThan(1e-6);
      // Y el analítico es de verdad un máximo local.
      const h = 1e-3 * costo;
      expect(utilidadEsperada(m, costo, ana)).toBeGreaterThanOrEqual(utilidadEsperada(m, costo, ana + h));
      expect(utilidadEsperada(m, costo, ana)).toBeGreaterThanOrEqual(utilidadEsperada(m, costo, ana - h));
    }
  });

  it("rechaza un modelo sin pendiente negativa", () => {
    expect(() => precioOptimo({ a: 0, b: 0.1 }, 10)).toThrow();
  });
});
