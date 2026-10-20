import { Prng } from "./prng.ts";
import { probabilidadGanar, type ModeloLogistico, type Oferta } from "./precio/logistica.ts";

/** Historial sintético de ofertas: precios uniformes en [min, max], resultado Bernoulli bajo el modelo dado. */
export function generarHistorial(semilla: number, n: number, modelo: ModeloLogistico, min: number, max: number): Oferta[] {
  const r = new Prng(semilla);
  return Array.from({ length: n }, () => {
    const precio = r.uniforme(min, max);
    return { precio, gano: r.siguiente() < probabilidadGanar(modelo, precio) };
  });
}
