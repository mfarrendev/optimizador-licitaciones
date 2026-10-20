import { describe, expect, it } from "vitest";
import { generarHistorial } from "../src/generadorOfertas.ts";
import { ajustarGradiente, ajustarNewton, logVerosimilitud } from "../src/precio/logistica.ts";

// Verdad conocida: a 80 de precio gana la mitad de las veces; cada 10 de alza cambia el logit en -2.
const VERDAD = { a: 16, b: -0.2 };

/*
 * Medición (2026-10-20): con el signo del gradiente invertido en
 * ajustarNewton (`ga -= r; gb -= r * z`) caen 2 de 3 pruebas: Newton deja de
 * converger (convergio=false tras 100 iteraciones) y su intercepto queda en
 * -0,000005 contra 16,18 del descenso de gradiente. Revertido, 3 de 3 en verde.
 */
describe("ajuste logístico por máxima verosimilitud", () => {
  it("Newton recupera parámetros conocidos con 20 000 ofertas", () => {
    const datos = generarHistorial(42, 20_000, VERDAD, 50, 110);
    const r = ajustarNewton(datos);
    expect(r.convergio).toBe(true);
    expect(r.iteraciones).toBeLessThan(15);
    expect(r.modelo.b).toBeCloseTo(VERDAD.b, 1);
    expect(Math.abs(r.modelo.b - VERDAD.b) / -VERDAD.b).toBeLessThan(0.05);
    // El punto de indiferencia -a/b es lo que importa para fijar precio.
    expect(-r.modelo.a / r.modelo.b).toBeCloseTo(80, 0);
  });

  it("el estimador de Newton maximiza la verosimilitud y coincide con descenso de gradiente", () => {
    const datos = generarHistorial(7, 2_000, VERDAD, 50, 110);
    const n = ajustarNewton(datos);
    const g = ajustarGradiente(datos);
    expect(g.convergio).toBe(true);
    expect(g.modelo.a).toBeCloseTo(n.modelo.a, 3);
    expect(g.modelo.b).toBeCloseTo(n.modelo.b, 5);
    const llOpt = logVerosimilitud(n.modelo, datos);
    for (const [da, db] of [[0.05, 0], [-0.05, 0], [0, 0.001], [0, -0.001]] as const) {
      expect(logVerosimilitud({ a: n.modelo.a + da, b: n.modelo.b + db }, datos)).toBeLessThan(llOpt);
    }
    expect(llOpt).toBeGreaterThan(logVerosimilitud(VERDAD, datos) - 1e-9);
  });

  it("rechaza historiales sin variación", () => {
    expect(() => ajustarNewton([{ precio: 1, gano: true }, { precio: 2, gano: true }])).toThrow();
    expect(() => ajustarNewton([{ precio: 1, gano: true }, { precio: 1, gano: false }])).toThrow();
  });
});
