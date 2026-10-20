# optimizador-licitaciones

Dos decisiones que enfrenta una empresa que vive de postular a licitaciones: a cuáles presentarse con un equipo de horas limitadas, y qué precio ofertar en cada una. Este repositorio las formula como problemas de optimización y las resuelve con algoritmos escritos desde cero en TypeScript, sin dependencias en tiempo de ejecución.

Todos los datos son sintéticos y salen de un generador con semilla. No hay licitaciones, organismos ni empresas reales.

## Uso

Requiere Node 24 (ejecuta TypeScript directamente).

```bash
npm install
npm test          # vitest
npm run typecheck # tsc estricto
npm run bench     # tablas de abajo, unos 50 s
```

```ts
import { construirMochila } from "./src/cartera/modelo.ts";
import { branchAndBound } from "./src/cartera/branchAndBound.ts";
import { recocido } from "./src/cartera/recocido.ts";
import { ajustarNewton } from "./src/precio/logistica.ts";
import { precioOptimo } from "./src/precio/precioOptimo.ts";

const { mochila, indices } = construirMochila(licitaciones, equipo);
const exacto = branchAndBound(mochila, { maxNodos: 1_000_000 }); // exacto.optimo dice si terminó
const rapido = recocido(mochila, { semilla: 1 });
const elegidas = exacto.elegidos.map((j) => licitaciones[indices[j]]);

const { modelo } = ajustarNewton(historial); // [{ precio, gano }, ...]
const { precio, probabilidad } = precioOptimo(modelo, costo);
```

## 1. Selección de cartera

Cada licitación $i$ tiene un monto $M_i$, un margen esperado $m_i$, una probabilidad de adjudicarse $p_i$, horas de trabajo $h_i$, una semana de cierre y un conjunto de habilidades requeridas. El equipo tiene una capacidad de horas $H_s$ en cada semana $s$ del horizonte y un conjunto de habilidades.

Las horas de la licitación $i$ se reparten en partes iguales en sus $d_i$ semanas de preparación, que terminan en la semana de cierre. Eso define $a_{si}$, las horas que consume en la semana $s$. Una licitación que pide una habilidad que el equipo no tiene se descarta antes de optimizar. Con $x_i \in \{0,1\}$ (postular o no):

$$
\max_{x} \sum_{i} M_i \, m_i \, p_i \, x_i
\quad \text{s.a.} \quad
\sum_{i} a_{si} \, x_i \le H_s \;\; \forall s,
\qquad x_i \in \{0, 1\}.
$$

Es una mochila multidimensional 0-1, NP-difícil. Se resuelve de dos formas.

**Branch and bound** (`src/cartera/branchAndBound.ts`). Búsqueda en profundidad que decide un ítem por nivel, primero incluirlo, en orden de eficiencia agregada $v_i / \sum_s (a_{si}/H_s)$, partiendo de la solución greedy como incumbente. La cota en cada nodo es

$$
UB = \min_{s} \; \mathrm{LP}_s,
$$

donde $\mathrm{LP}_s$ es la relajación lineal de la mochila de una sola dimensión $s$ sobre los ítems no decididos (algoritmo de Dantzig: ordenar por $v_i/a_{si}$ y fraccionar el último). Cada $\mathrm{LP}_s$ es cota válida porque soltar las demás restricciones agranda la región factible. Es más floja que la relajación lineal conjunta, que pediría un simplex, pero cuesta $O(mn)$ por nodo. Acepta un tope de nodos y avisa con `optimo: false` si lo alcanzó.

**Recocido simulado** (`src/cartera/recocido.ts`). Trabaja solo con soluciones factibles: el movimiento elige un ítem al azar; si está dentro lo saca, y si está fuera lo mete y saca ítems al azar hasta volver a la factibilidad. Así no hay que calibrar penalizaciones. Aceptación de Metropolis con enfriamiento geométrico, temperatura inicial igual a dos veces el valor medio de un ítem, y un relleno greedy al final. Con temperatura inicial 0,5 la peor brecha en las pruebas era 14 %; con 2 alcanza el óptimo en las 40 instancias de prueba.

## 2. Precio de la oferta

La probabilidad de ganar se modela como logística en el precio $p$:

$$
P(\text{ganar} \mid p) = \sigma(a + b\,p) = \frac{1}{1 + e^{-(a + b p)}}, \qquad b < 0.
$$

Los parámetros se estiman por máxima verosimilitud sobre un historial de ofertas $(p_j, y_j)$, con $y_j = 1$ si se ganó:

$$
\ell(a, b) = \sum_j \Big[ y_j \log \sigma(a + b p_j) + (1 - y_j) \log\big(1 - \sigma(a + b p_j)\big) \Big].
$$

`ajustarNewton` usa Newton-Raphson (equivalente a IRLS) con la hessiana 2x2 invertida en forma cerrada y búsqueda lineal por bisección del paso; `ajustarGradiente` usa descenso de gradiente con tasa fija y sirve de referencia. Ambos estandarizan el precio antes de iterar: con precios del orden de $10^5$ la hessiana queda mal condicionada.

Con el modelo ajustado y el costo $c$, el precio elegido es

$$
p^\* = \arg\max_{p \ge c} \; (p - c)\,\sigma(a + b p),
$$

que se busca por sección dorada en $[c,\; c + 40/|b|]$. La función tiene un único máximo, así que la sección dorada es suficiente y no necesita derivadas. Para validarla existe la solución cerrada: con $k = -b$, la condición de primer orden lleva a $u e^u = e^{a - kc - 1}$ con $u = k(p - c) - 1$, y entonces

$$
p^\* = c + \frac{1 + W\!\left(e^{a - kc - 1}\right)}{k},
$$

con $W$ la rama principal de la función de Lambert. Para $a = 1$, $b = -1$, $c = 0$ da $p^\* = 1 + \Omega \approx 1{,}5671$.

## Pruebas

Las pruebas comprueban conducta, no texto:

- El branch and bound coincide con la enumeración de los $2^n$ subconjuntos en 200 mochilas aleatorias (4 a 14 ítems, 1 a 4 restricciones) y en 30 carteras sintéticas.
- El recocido queda bajo 0,5 % de brecha media y 2 % de brecha máxima frente al óptimo exacto en 40 carteras de 25 licitaciones, y supera al greedy de partida en parte de ellas.
- El ajuste por Newton recupera $b$ con menos de 5 % de error y el punto de indiferencia $-a/b$ al entero con 20 000 ofertas simuladas; coincide con el descenso de gradiente y es un máximo local de la verosimilitud.
- El precio por sección dorada coincide con la fórmula de Lambert en 300 modelos aleatorios (error relativo bajo $10^{-6}$).

Cada archivo de prueba anota la mutación que se introdujo a mano para comprobar que la prueba cae y cuántos casos cayeron: cota multiplicada por 0,9 en el B&B (caen 3 de 3), recocido sin búsqueda y sin Metropolis (cae en ambos casos), signo del gradiente invertido en Newton (caen 2 de 3) y sección dorada buscando el mínimo (caen 3 de 4).

## Resultados del benchmark

Salida de `npm run bench` en un Apple M1 Pro con Node 24.11. Los valores y brechas son idénticos en cualquier máquina porque todo sale de semillas fijas; los tiempos no.

## Selección de cartera

5 instancias por tamaño (semillas 1..5), 8 semanas, capacidad = 40 % de la demanda. Tope del B&B: 3.000.000 nodos.

| n | ítems elegibles | B&B óptimos probados | B&B ms (media) | B&B nodos (media) | recocido ms (media) | valor B&B (suma) | valor recocido (suma) | brecha media % | brecha máx % | greedy brecha media % | recocido sobre B&B truncado % |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10 | 8,6 | 5/5 | 0,2 | 18 | 17,8 | 33.327 | 33.327 | 0,000 | 0,000 | 0,000 | - |
| 20 | 17,0 | 5/5 | 0,4 | 146 | 17,1 | 168.128 | 168.128 | 0,000 | 0,000 | 9,549 | - |
| 30 | 24,0 | 5/5 | 0,9 | 839 | 22,0 | 360.867 | 360.867 | 0,000 | 0,000 | 1,555 | - |
| 40 | 31,0 | 5/5 | 5,5 | 5.500 | 27,1 | 642.931 | 642.541 | 0,050 | 0,248 | 3,955 | - |
| 60 | 48,6 | 5/5 | 601,9 | 380.842 | 43,6 | 1.079.176 | 1.077.334 | 0,160 | 0,642 | 0,890 | - |
| 80 | 63,2 | 3/5 | 3.482,1 | 1.833.640 | 74,6 | 1.528.742 | 1.525.393 | 0,350 | 1,004 | 2,495 | -0,079 |
| 120 | 94,4 | 0/5 | 6.984,9 | 3.000.000 | 105,5 | 2.419.961 | 2.417.762 | - | - | - | -0,074 |

## Precio de la oferta

Modelo verdadero a = 16, b = -0.2; costo = 55. Historial sintético con precios uniformes en [50, 110].

| ofertas en el historial | a estimado | b estimado | iter. Newton | iter. gradiente | precio óptimo (ajustado) | precio óptimo (verdadero, analítico) | P(ganar) |
|---|---|---|---|---|---|---|---|
| 50 | 18,41 | -0,2289 | 9 | 1564 | 74,88 | 74,63 | 0,780 |
| 200 | 13,14 | -0,1683 | 8 | 1144 | 73,56 | 74,63 | 0,680 |
| 1000 | 15,04 | -0,1879 | 7 | 1450 | 74,74 | 74,63 | 0,730 |
| 5000 | 16,11 | -0,2008 | 8 | 1608 | 74,81 | 74,63 | 0,749 |

Lectura:

- Hasta 40 licitaciones el B&B prueba el óptimo en milisegundos. Entre 60 y 80 el número de nodos crece en dos órdenes de magnitud, y en 120 ninguna instancia termina dentro del tope de 3 millones de nodos.
- La brecha del recocido se mide solo contra óptimos probados. Hasta 30 licitaciones encuentra el óptimo en todas las instancias; en 40 a 80 queda en promedio entre 0,05 % y 0,35 % bajo el óptimo, con un peor caso de 1 %.
- Cuando el B&B se corta, su valor es solo una cota inferior. La última columna compara el recocido contra esa solución truncada: en 80 y 120 el recocido queda un 0,08 % por debajo, en una fracción del tiempo.
- El greedy solo, sin búsqueda, deja hasta 9,5 % de brecha media: la búsqueda local paga.
- En precio, Newton converge en 7 a 9 iteraciones contra más de mil del descenso de gradiente. Con 50 ofertas el precio óptimo estimado ya queda a menos de 1,5 % del verdadero, aunque los parámetros individuales tengan error mayor: la utilidad esperada es plana cerca del máximo.

## Limitaciones

- La cota del B&B es el mínimo de relajaciones de una dimensión, no la relajación lineal conjunta. Por eso el árbol explota sobre unas 60 licitaciones elegibles; un simplex o cortes de cobertura lo llevarían más lejos.
- El modelo de cartera es determinista en las horas: no considera que una licitación perdida libera horas de ejecución, ni dependencias entre licitaciones, ni riesgo (maximiza el valor esperado, no penaliza la varianza).
- Las habilidades se tratan como filtro de elegibilidad, no como capacidad por especialidad.
- La probabilidad de ganar depende solo del precio. En la práctica también depende de la competencia, del puntaje técnico y del organismo; el modelo admite agregar covariables, pero el ajuste implementado tiene solo intercepto y pendiente.
- El historial sintético está bien especificado (los datos salen del mismo modelo logístico que se ajusta). Con datos reales habría que validar la forma funcional y la calibración.
- El generador de instancias es una aproximación razonable, no una distribución calibrada contra datos.
- El recocido no tiene garantía de calidad; sus parámetros se fijaron mirando estas instancias.

## Licencia

MIT. Ver `LICENSE`.
