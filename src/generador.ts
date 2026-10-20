import { Prng } from "./prng.ts";
import type { Equipo, Licitacion, Mochila } from "./tipos.ts";

const HABILIDADES = ["ingenieria", "datos", "legal", "finanzas", "terreno", "software"];

export interface OpcionesInstancia {
  n: number;
  semanas?: number;
  /** Fracción de la demanda total de horas que cubre la capacidad (0..1). */
  holgura?: number;
}

/**
 * Instancia sintética de cartera. Todo sale del PRNG con semilla: no hay datos
 * reales. Los montos siguen una lognormal (pocas licitaciones grandes, muchas
 * chicas), las horas crecen con el monto con ruido, y la probabilidad de
 * adjudicar baja levemente con el monto. La capacidad se fija como una
 * fracción de la demanda para que la restricción muerda.
 */
export function generarCartera(semilla: number, o: OpcionesInstancia): { licitaciones: Licitacion[]; equipo: Equipo } {
  const r = new Prng(semilla);
  const semanas = o.semanas ?? 8;
  const holgura = o.holgura ?? 0.4;
  const licitaciones: Licitacion[] = [];
  for (let i = 0; i < o.n; i++) {
    const monto = Math.round(Math.exp(r.uniforme(Math.log(5_000), Math.log(400_000))));
    const horas = Math.round(20 + 0.0008 * monto * r.uniforme(0.6, 1.6) + r.uniforme(0, 40));
    const habilidades = [HABILIDADES[r.entero(0, 5)]!];
    if (r.siguiente() < 0.3) habilidades.push(HABILIDADES[r.entero(0, 5)]!);
    licitaciones.push({
      id: `L${String(i + 1).padStart(3, "0")}`,
      monto,
      margen: Math.round(r.uniforme(0.08, 0.35) * 100) / 100,
      probabilidad: Math.round(Math.min(0.9, Math.max(0.05, r.uniforme(0.15, 0.7) - 0.05 * Math.log10(monto / 5_000))) * 100) / 100,
      horas,
      semanaCierre: r.entero(0, semanas - 1),
      semanasPreparacion: r.entero(1, 3),
      habilidades: [...new Set(habilidades)],
    });
  }
  const demanda = licitaciones.reduce((s, l) => s + l.horas, 0);
  // Una de las seis habilidades falta en el equipo: algunas licitaciones quedan fuera.
  const falta = r.entero(0, 5);
  const equipo: Equipo = {
    capacidadSemanal: Array.from({ length: semanas }, () => Math.round((holgura * demanda) / semanas * r.uniforme(0.7, 1.3))),
    habilidades: HABILIDADES.filter((_, k) => k !== falta),
  };
  return { licitaciones, equipo };
}

/** Mochila multidimensional aleatoria directa, para pruebas contra fuerza bruta. */
export function generarMochila(semilla: number, n: number, m: number): Mochila {
  const r = new Prng(semilla);
  const peso = Array.from({ length: m }, () => Array.from({ length: n }, () => r.entero(0, 30)));
  return {
    valor: Array.from({ length: n }, () => r.entero(1, 100)),
    peso,
    capacidad: peso.map((fila) => Math.round(fila.reduce((a, b) => a + b, 0) * r.uniforme(0.25, 0.6))),
  };
}
