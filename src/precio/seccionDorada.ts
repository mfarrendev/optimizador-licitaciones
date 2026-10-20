const INV_PHI = (Math.sqrt(5) - 1) / 2;

/**
 * Máximo de una función unimodal en [a, b] por sección dorada. Reutiliza una
 * evaluación por iteración y reduce el intervalo en un factor 0,618; no
 * necesita derivadas.
 */
export function seccionDorada(f: (x: number) => number, a: number, b: number, tol = 1e-9, maxIter = 200): { x: number; valor: number; iteraciones: number } {
  if (!(b > a)) throw new Error("Intervalo vacío");
  let c = b - INV_PHI * (b - a);
  let d = a + INV_PHI * (b - a);
  let fc = f(c);
  let fd = f(d);
  let it = 0;
  while (b - a > tol * Math.max(1, Math.abs(a) + Math.abs(b)) && it < maxIter) {
    it++;
    if (fc > fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - INV_PHI * (b - a);
      fc = f(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + INV_PHI * (b - a);
      fd = f(d);
    }
  }
  const x = (a + b) / 2;
  return { x, valor: f(x), iteraciones: it };
}
