/**
 * Generador pseudoaleatorio reproducible (mulberry32).
 *
 * Math.random no acepta semilla, y el benchmark y las pruebas tienen que dar
 * los mismos números en cualquier máquina. mulberry32 tiene período 2^32,
 * suficiente para instancias sintéticas; no sirve para criptografía.
 */
export class Prng {
  private estado: number;

  constructor(semilla: number) {
    this.estado = semilla >>> 0;
  }

  /** Uniforme en [0, 1). */
  siguiente(): number {
    this.estado = (this.estado + 0x6d2b79f5) >>> 0;
    let t = this.estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniforme en [a, b). */
  uniforme(a: number, b: number): number {
    return a + (b - a) * this.siguiente();
  }

  /** Entero uniforme en [a, b] (ambos incluidos). */
  entero(a: number, b: number): number {
    return a + Math.floor(this.siguiente() * (b - a + 1));
  }

  /** Normal estándar por Box-Muller. */
  normal(): number {
    let u = 0;
    while (u === 0) u = this.siguiente();
    const v = this.siguiente();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}
