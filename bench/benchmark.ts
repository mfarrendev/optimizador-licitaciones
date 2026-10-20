/**
 * Benchmark reproducible: todas las instancias salen de semillas fijas.
 * Los valores (óptimo, heurístico, brecha) son idénticos en cualquier
 * máquina; los tiempos no.
 *
 *   npm run bench
 */
import { branchAndBound } from "../src/cartera/branchAndBound.ts";
import { greedy } from "../src/cartera/greedy.ts";
import { construirMochila } from "../src/cartera/modelo.ts";
import { recocido } from "../src/cartera/recocido.ts";
import { generarCartera } from "../src/generador.ts";
import { generarHistorial } from "../src/generadorOfertas.ts";
import { ajustarGradiente, ajustarNewton } from "../src/precio/logistica.ts";
import { precioOptimo, precioOptimoAnalitico } from "../src/precio/precioOptimo.ts";

const TAMANOS = [10, 20, 30, 40, 60, 80, 120];
const INSTANCIAS = 5;
const MAX_NODOS = 3_000_000;

function cronometrar<T>(f: () => T): [T, number] {
  const t0 = performance.now();
  const r = f();
  return [r, performance.now() - t0];
}
const fmt = (x: number, d = 1) => x.toLocaleString("es-CL", { minimumFractionDigits: d, maximumFractionDigits: d });

console.log("## Selección de cartera\n");
console.log(`${INSTANCIAS} instancias por tamaño (semillas 1..${INSTANCIAS}), 8 semanas, capacidad = 40 % de la demanda. Tope del B&B: ${fmt(MAX_NODOS, 0)} nodos.\n`);
console.log("| n | ítems elegibles | B&B óptimos probados | B&B ms (media) | B&B nodos (media) | recocido ms (media) | valor B&B (suma) | valor recocido (suma) | brecha media % | brecha máx % | greedy brecha media % | recocido sobre B&B truncado % |");
console.log("|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const n of TAMANOS) {
  let probados = 0, tBB = 0, tSA = 0, nodos = 0, vE = 0, vH = 0, elegibles = 0;
  const brechas: number[] = [];
  const brechasG: number[] = [];
  const truncadas: number[] = [];
  for (let s = 1; s <= INSTANCIAS; s++) {
    const { licitaciones, equipo } = generarCartera(1000 * n + s, { n });
    const { mochila } = construirMochila(licitaciones, equipo);
    elegibles += mochila.valor.length;
    const [bb, t1] = cronometrar(() => branchAndBound(mochila, { maxNodos: MAX_NODOS }));
    const [sa, t2] = cronometrar(() => recocido(mochila, { semilla: s }));
    if (bb.optimo) probados++;
    tBB += t1; tSA += t2; nodos += bb.nodos; vE += bb.valor; vH += sa.valor;
    // La brecha solo se calcula contra óptimos probados. Si el B&B se cortó,
    // su valor es una cota inferior y se informa aparte cuánto lo supera el recocido.
    if (bb.optimo) {
      brechas.push(Math.max(0, (100 * (bb.valor - sa.valor)) / bb.valor)); // max(0, ·): ruido de redondeo
      brechasG.push((100 * (bb.valor - greedy(mochila).valor)) / bb.valor);
    } else {
      truncadas.push((100 * (sa.valor - bb.valor)) / bb.valor);
    }
  }
  const media = (xs: number[]) => (xs.length ? fmt(xs.reduce((a, b) => a + b, 0) / xs.length, 3) : "-");
  const maximo = (xs: number[]) => (xs.length ? fmt(Math.max(...xs), 3) : "-");
  console.log(`| ${n} | ${fmt(elegibles / INSTANCIAS)} | ${probados}/${INSTANCIAS} | ${fmt(tBB / INSTANCIAS)} | ${fmt(nodos / INSTANCIAS, 0)} | ${fmt(tSA / INSTANCIAS)} | ${fmt(vE, 0)} | ${fmt(vH, 0)} | ${media(brechas)} | ${maximo(brechas)} | ${media(brechasG)} | ${media(truncadas)} |`);
}

console.log("\n## Precio de la oferta\n");
const verdad = { a: 16, b: -0.2 };
const costo = 55;
console.log(`Modelo verdadero a = ${verdad.a}, b = ${verdad.b}; costo = ${costo}. Historial sintético con precios uniformes en [50, 110].\n`);
console.log("| ofertas en el historial | a estimado | b estimado | iter. Newton | iter. gradiente | precio óptimo (ajustado) | precio óptimo (verdadero, analítico) | P(ganar) |");
console.log("|---|---|---|---|---|---|---|---|");
const pVerdad = precioOptimoAnalitico(verdad, costo);
for (const n of [50, 200, 1000, 5000]) {
  const datos = generarHistorial(n, n, verdad, 50, 110);
  const nw = ajustarNewton(datos);
  const gd = ajustarGradiente(datos);
  const p = precioOptimo(nw.modelo, costo);
  console.log(`| ${n} | ${fmt(nw.modelo.a, 2)} | ${fmt(nw.modelo.b, 4)} | ${nw.iteraciones} | ${gd.convergio ? gd.iteraciones : "no convergió"} | ${fmt(p.precio, 2)} | ${fmt(pVerdad, 2)} | ${fmt(p.probabilidad, 3)} |`);
}
