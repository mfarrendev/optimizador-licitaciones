export interface Licitacion {
  id: string;
  /** Monto ofertado, en unidades monetarias. */
  monto: number;
  /** Margen esperado sobre el monto, entre 0 y 1. */
  margen: number;
  /** Probabilidad de adjudicarse la licitación si se postula. */
  probabilidad: number;
  /** Horas de equipo que consume preparar la oferta y ejecutarla. */
  horas: number;
  /** Semana (0-indexada) en que cierra la recepción de ofertas. */
  semanaCierre: number;
  /** Semanas previas al cierre en que se reparten las horas, en partes iguales. */
  semanasPreparacion: number;
  habilidades: string[];
}

export interface Equipo {
  /** Horas disponibles por semana; el largo define el horizonte. */
  capacidadSemanal: number[];
  habilidades: string[];
}

/**
 * Forma canónica de la mochila multidimensional 0-1:
 * maximizar sum(valor[i] x[i]) sujeto a sum(peso[k][i] x[i]) <= capacidad[k].
 */
export interface Mochila {
  valor: number[];
  /** peso[k][i]: consumo del ítem i en la restricción k. */
  peso: number[][];
  capacidad: number[];
}

export interface Solucion {
  /** Índices elegidos, en orden creciente. */
  elegidos: number[];
  valor: number;
}
