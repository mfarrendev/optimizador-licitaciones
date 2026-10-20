import { probabilidadGanar, type ModeloLogistico } from "./logistica.ts";
import { seccionDorada } from "./seccionDorada.ts";

/** Utilidad esperada de ofertar a `precio`: (precio - costo) x P(ganar). */
export function utilidadEsperada(m: ModeloLogistico, costo: number, precio: number): number {
  return (precio - costo) * probabilidadGanar(m, precio);
}

/**
 * Precio que maximiza la utilidad esperada. Con b < 0 la función es
 * negativa bajo el costo, positiva sobre él y tiende a cero cuando el
 * precio crece, con un único máximo (es log-cóncava en p - c), así que la
 * sección dorada sobre [costo, costo + 40/|b|] lo encuentra: a esa distancia
 * la probabilidad ya cayó en un factor e^40.
 */
export function precioOptimo(m: ModeloLogistico, costo: number): { precio: number; probabilidad: number; utilidad: number } {
  if (!(m.b < 0)) throw new Error("El modelo debe tener pendiente negativa: si subir el precio no baja la probabilidad, no hay óptimo finito");
  const r = seccionDorada((p) => utilidadEsperada(m, costo, p), costo, costo + 40 / -m.b, 1e-12);
  return { precio: r.x, probabilidad: probabilidadGanar(m, r.x), utilidad: r.valor };
}

/** W principal de Lambert para x >= 0, por Newton (Halley sería más rápido; no hace falta). */
export function lambertW(x: number): number {
  if (x < 0) throw new Error("Solo se implementa la rama x >= 0");
  let w = x < 1 ? x : Math.log(x) - Math.log(Math.log(x) + 1);
  for (let i = 0; i < 100; i++) {
    const e = Math.exp(w);
    const paso = (w * e - x) / (e * (w + 1));
    w -= paso;
    if (Math.abs(paso) < 1e-15 * Math.max(1, Math.abs(w))) break;
  }
  return w;
}

/**
 * Solución cerrada. Con k = -b > 0 y m = p - c, la condición de primer orden
 * de (p - c) sigma(a + b p) es 1 = m k (1 - sigma), es decir
 * m k - 1 = exp(a - k c) exp(-k m). Con u = m k - 1 queda
 * u e^u = exp(a - k c - 1), y entonces p* = c + (1 + W(exp(a - k c - 1))) / k.
 */
export function precioOptimoAnalitico(m: ModeloLogistico, costo: number): number {
  const k = -m.b;
  return costo + (1 + lambertW(Math.exp(m.a - k * costo - 1))) / k;
}
