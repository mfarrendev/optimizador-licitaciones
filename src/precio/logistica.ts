/**
 * Probabilidad de ganar en función del precio ofertado:
 *   P(ganar | p) = 1 / (1 + exp(-(a + b p)))
 * con b < 0 cuando subir el precio baja la probabilidad.
 */
export interface ModeloLogistico {
  a: number;
  b: number;
}

export interface Oferta {
  precio: number;
  gano: boolean;
}

export const sigmoide = (z: number): number => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)));

export function probabilidadGanar(m: ModeloLogistico, precio: number): number {
  return sigmoide(m.a + m.b * precio);
}

/** Log-verosimilitud del historial bajo el modelo. */
export function logVerosimilitud(m: ModeloLogistico, datos: Oferta[]): number {
  let ll = 0;
  for (const { precio, gano } of datos) {
    const z = m.a + m.b * precio;
    // log(sigma(z)) = -log(1+e^-z); escrito con log1p para no desbordar.
    ll += gano ? -log1pExp(-z) : -log1pExp(z);
  }
  return ll;
}
const log1pExp = (z: number): number => (z > 30 ? z : Math.log1p(Math.exp(z)));

export interface ResultadoAjuste {
  modelo: ModeloLogistico;
  iteraciones: number;
  convergio: boolean;
}

/**
 * Estandariza el precio antes de optimizar: con precios del orden de 1e5 la
 * hessiana queda mal condicionada y el descenso de gradiente no avanza. Los
 * coeficientes se devuelven en unidades del precio original.
 */
function estandarizar(datos: Oferta[]): { z: number[]; y: number[]; mu: number; sd: number } {
  if (datos.length < 2) throw new Error("Se necesitan al menos dos ofertas");
  const n = datos.length;
  const mu = datos.reduce((s, d) => s + d.precio, 0) / n;
  const sd = Math.sqrt(datos.reduce((s, d) => s + (d.precio - mu) ** 2, 0) / n);
  if (sd === 0) throw new Error("Todos los precios son iguales: la pendiente no es identificable");
  if (datos.every((d) => d.gano) || datos.every((d) => !d.gano)) throw new Error("El historial necesita ofertas ganadas y perdidas");
  return { z: datos.map((d) => (d.precio - mu) / sd), y: datos.map((d) => (d.gano ? 1 : 0)), mu, sd };
}
const desestandarizar = (a: number, b: number, mu: number, sd: number): ModeloLogistico => ({ a: a - (b * mu) / sd, b: b / sd });

/**
 * Máxima verosimilitud por Newton-Raphson (equivalente a IRLS). Con dos
 * parámetros la hessiana es 2x2 y se invierte en forma cerrada. Si un paso
 * no mejora la verosimilitud se divide a la mitad (búsqueda lineal), lo que
 * evita las oscilaciones cuando los datos están casi separados.
 */
export function ajustarNewton(datos: Oferta[], tol = 1e-10, maxIter = 100): ResultadoAjuste {
  const { z, y, mu, sd } = estandarizar(datos);
  let a = 0;
  let b = 0;
  const ll = (a: number, b: number) => logVerosimilitud({ a, b }, z.map((p, i) => ({ precio: p, gano: y[i] === 1 })));
  for (let it = 1; it <= maxIter; it++) {
    let ga = 0, gb = 0, haa = 0, hab = 0, hbb = 0;
    for (let i = 0; i < z.length; i++) {
      const p = sigmoide(a + b * z[i]!);
      const r = y[i]! - p;
      const w = p * (1 - p);
      ga += r;
      gb += r * z[i]!;
      haa += w;
      hab += w * z[i]!;
      hbb += w * z[i]! * z[i]!;
    }
    const det = haa * hbb - hab * hab;
    if (det <= 0) return { modelo: desestandarizar(a, b, mu, sd), iteraciones: it, convergio: false };
    // Paso de Newton: H^{-1} g, con H la información observada (menos la hessiana).
    const da = (hbb * ga - hab * gb) / det;
    const db = (haa * gb - hab * ga) / det;
    const base = ll(a, b);
    let paso = 1;
    while (paso > 1e-8 && ll(a + paso * da, b + paso * db) < base) paso /= 2;
    a += paso * da;
    b += paso * db;
    if (Math.abs(paso * da) + Math.abs(paso * db) < tol) return { modelo: desestandarizar(a, b, mu, sd), iteraciones: it, convergio: true };
  }
  return { modelo: desestandarizar(a, b, mu, sd), iteraciones: maxIter, convergio: false };
}

/**
 * Máxima verosimilitud por descenso de gradiente con tasa fija sobre la
 * log-verosimilitud media. Converge más lento que Newton (cientos o miles
 * de iteraciones contra menos de diez) y se deja como referencia: las
 * pruebas comprueban que ambos llegan al mismo punto.
 */
export function ajustarGradiente(datos: Oferta[], tasa = 0.5, tol = 1e-9, maxIter = 100_000): ResultadoAjuste {
  const { z, y, mu, sd } = estandarizar(datos);
  const n = z.length;
  let a = 0;
  let b = 0;
  for (let it = 1; it <= maxIter; it++) {
    let ga = 0, gb = 0;
    for (let i = 0; i < n; i++) {
      const r = y[i]! - sigmoide(a + b * z[i]!);
      ga += r;
      gb += r * z[i]!;
    }
    a += (tasa * ga) / n;
    b += (tasa * gb) / n;
    if (Math.hypot(ga, gb) / n < tol) return { modelo: desestandarizar(a, b, mu, sd), iteraciones: it, convergio: true };
  }
  return { modelo: desestandarizar(a, b, mu, sd), iteraciones: maxIter, convergio: false };
}
