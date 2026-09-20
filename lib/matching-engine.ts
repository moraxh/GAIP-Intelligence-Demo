// Motor de cruce fuzzy Licitación (GAIP, real) ↔ Proyecto (fuente externa, ilustrativa hoy).
//
// Por qué existe: "Velar Intelligence" cruza datos de fuentes que nunca traen un ID
// compartido limpio — no es un caso especial de este demo, es la premisa del producto.
// La Fase 1 (Finanzas/Obra) usó un `licitacionId` hardcodeado a mano; este motor lo
// reemplaza por un score de similitud calculado en runtime sobre señales reales
// (número de procedimiento, nombre, dependencia, fechas), con un umbral alto: solo se
// cruza automáticamente cuando la confianza es muy alta, nunca se adivina.
//
// Corre en runtime del cliente (no en scripts/build-mock-data.mjs): es lógica de negocio,
// no dato generado — no pertenece a lib/mock-data.ts (que solo contiene datos reales de
// GAIP, nunca a mano). Dataset trivial (decenas de registros), memoizar con useMemo en
// los componentes que lo usan.
//
// Caso de prueba obligatorio: "Tramo III" aparece DOS VECES en lib/mock-data.ts con IDs
// completamente distintos (XLS-LO09JZO009JZO001N342026 y E-2026-00080086) porque proviene
// de dos fuentes distintas — mismo numero y nombre exactos, pero entidad/estado/estatus/tipo
// difieren. Ese par debe cruzar con score alto. Ver scripts/verify-matching-engine.mjs.

import type { Licitacion } from './mock-data.ts';
import { normalizeProcedureName, normalizeNumero, extractRomanOrOrdinal } from './text-normalization.ts';

export const MATCH_THRESHOLD = 0.85;

const ORDEN_ESTADO = ['Fallo', 'Construcción', 'En trabajo', 'Filtrada', 'Detectada'] as const;

export type ProyectoParaCruce = {
  id: string;
  name: string;
  client: string;
  numeroProcedimiento?: string;
  contractStart?: string; // formato "DD mmm YYYY", igual que Licitacion.fallo
};

export type MatchSignalName = 'numero' | 'nombre' | 'dependencia' | 'fechaFallo';

export type MatchSignal = {
  name: MatchSignalName;
  weight: number;      // peso ya renormalizado sobre las señales aplicables de este par
  score: number;        // 0..1
  applicable: boolean;
  detail: string;
};

export type MatchCandidate = {
  licitacionId: string;
  proyectoId: string;
  score: number;         // 0..1, ya con el piso de confianza aplicado si corresponde
  signals: MatchSignal[];
};

export type MatchResult = {
  proyectoId: string;
  licitacionId: string | null;  // null si no se alcanzó el umbral
  score: number | null;
  signals: MatchSignal[];
  autoLinked: boolean;
  ambiguous: boolean;
  bestRejectedCandidate: MatchCandidate | null; // el mejor candidato aunque no cruce, para mostrarlo en UI
};

const PESO_BASE: Record<MatchSignalName, number> = {
  numero: 0.55,
  nombre: 0.30,
  dependencia: 0.10,
  fechaFallo: 0.05,
};

// --- Similitud por señal ---

function bigrams(s: string): Set<string> {
  const clean = s.toUpperCase().replace(/[^A-Z0-9Ñ ]/g, ' ').replace(/\s+/g, ' ').trim();
  const grams = new Set<string>();
  for (let i = 0; i < clean.length - 1; i++) grams.add(clean.slice(i, i + 2));
  return grams;
}

export function diceCoefficient(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let intersection = 0;
  for (const g of A) if (B.has(g)) intersection++;
  return (2 * intersection) / (A.size + B.size);
}

// Blindaje obligatorio: dos nombres casi idénticos que difieren en un numeral romano o
// "Etapa N" probablemente describen tramos/etapas DISTINTOS del mismo macroproyecto (caso
// de prueba "Tramo II" vs "Tramo III" — ver scripts/verify-matching-engine.mjs). Sin este
// tope, nombre+dependencia+fecha solos pueden superar el umbral y cruzar mal.
export function nombreSimilarity(a: string, b: string): number {
  const base = diceCoefficient(a, b);
  const numeralA = extractRomanOrOrdinal(a);
  const numeralB = extractRomanOrOrdinal(b);
  if (numeralA && numeralB && numeralA !== numeralB) {
    return Math.min(base, 0.5);
  }
  return base;
}

const MESES_IDX: Record<string, number> = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 };

function parseFechaCorta(fecha: string): Date | null {
  const [, day, mesRaw, year] = fecha.match(/^(\d{2}) (\w{3}) (\d{4})/) ?? [];
  const mes = mesRaw?.toLowerCase();
  const mesIdx = mes ? MESES_IDX[mes] : undefined;
  if (!day || mesIdx === undefined) return null;
  return new Date(Number(year), mesIdx, Number(day));
}

// El fallo de la licitación debe preceder al inicio de contrato del proyecto (no puede
// firmarse un contrato antes de que exista el fallo). Decae suave dentro de una ventana
// de 120 días esperada entre fallo y arranque de obra.
function fechaFalloVsContrato(fallo: string, contractStart: string): number {
  const falloDate = parseFechaCorta(fallo);
  const contractDate = parseFechaCorta(contractStart);
  if (!falloDate || !contractDate) return 0;
  const dias = (contractDate.getTime() - falloDate.getTime()) / 86_400_000;
  if (dias < 0) return 0; // el contrato no puede empezar antes del fallo
  if (dias <= 120) return 1 - (dias / 120) * 0.3; // decae de 1.0 a 0.7 dentro de la ventana esperada
  return 0.2; // fuera de ventana, pero no se descarta del todo (demoras administrativas)
}

/** Calcula el score de un par (licitación, proyecto). Puro, sin efectos secundarios. */
export function scoreMatch(licitacion: Licitacion, proyecto: ProyectoParaCruce): MatchCandidate {
  const signals: MatchSignal[] = [];

  // --- numero ---
  const numeroLicitacion = normalizeNumero(licitacion.numero);
  const numeroProyecto = normalizeNumero(proyecto.numeroProcedimiento);
  const numeroAplicable = Boolean(numeroLicitacion && numeroProyecto);
  const numeroScore = numeroAplicable && numeroLicitacion === numeroProyecto ? 1 : 0;
  signals.push({
    name: 'numero',
    weight: PESO_BASE.numero,
    score: numeroScore,
    applicable: numeroAplicable,
    detail: numeroAplicable
      ? (numeroScore === 1 ? 'Número de procedimiento idéntico tras normalizar' : 'Número de procedimiento distinto')
      : 'Número de procedimiento no disponible en uno de los dos lados',
  });

  // --- nombre ---
  const nombreLicitacion = licitacion.nombre;
  const nombreProyecto = normalizeProcedureName(proyecto.name) ?? proyecto.name;
  const nombreAplicable = Boolean(nombreLicitacion && nombreProyecto);
  const nombreScore = nombreAplicable ? nombreSimilarity(nombreLicitacion, nombreProyecto) : 0;
  signals.push({
    name: 'nombre',
    weight: PESO_BASE.nombre,
    score: nombreScore,
    applicable: nombreAplicable,
    detail: nombreAplicable
      ? `Similitud de nombre: ${Math.round(nombreScore * 100)}%`
      : 'Nombre no disponible en uno de los dos lados',
  });

  // --- dependencia ---
  const depLicitacion = licitacion.dependencia?.trim().toUpperCase();
  const depProyecto = proyecto.client?.trim().toUpperCase();
  const depAplicable = Boolean(depLicitacion && depProyecto);
  const depScore = depAplicable && depLicitacion === depProyecto ? 1 : 0;
  signals.push({
    name: 'dependencia',
    weight: PESO_BASE.dependencia,
    score: depScore,
    applicable: depAplicable,
    detail: depAplicable
      ? (depScore === 1 ? `Dependencia coincide (${licitacion.dependencia})` : `Dependencia distinta (${licitacion.dependencia} vs ${proyecto.client})`)
      : 'Dependencia/cliente no disponible en uno de los dos lados',
  });

  // --- fechaFallo ---
  const fechaAplicable = Boolean(licitacion.fallo && proyecto.contractStart);
  const fechaScore = fechaAplicable ? fechaFalloVsContrato(licitacion.fallo!, proyecto.contractStart!) : 0;
  signals.push({
    name: 'fechaFallo',
    weight: PESO_BASE.fechaFallo,
    score: fechaScore,
    applicable: fechaAplicable,
    detail: fechaAplicable
      ? `Fallo ${licitacion.fallo} → inicio de contrato ${proyecto.contractStart} (proximidad ${Math.round(fechaScore * 100)}%)`
      : 'Fecha de fallo o inicio de contrato no disponible',
  });

  // --- combinar con renormalización sobre señales aplicables ---
  const aplicables = signals.filter((s) => s.applicable);
  const pesoTotal = aplicables.reduce((sum, s) => sum + s.weight, 0);
  let score = pesoTotal > 0 ? aplicables.reduce((sum, s) => sum + s.weight * s.score, 0) / pesoTotal : 0;

  // Piso de confianza: numero exacto es evidencia casi definitiva del mismo expediente,
  // incluso si el resto de metadatos diverge (patrón real del caso Tramo III).
  const numeroSignal = signals.find((s) => s.name === 'numero')!;
  if (numeroSignal.applicable && numeroSignal.score === 1) {
    score = Math.max(score, 0.90);
  }

  return { licitacionId: licitacion.id, proyectoId: proyecto.id, score, signals };
}

/**
 * Cruza cada proyecto con la mejor licitación candidata, usando asignación greedy global:
 * se calculan todos los pares con score >= MATCH_THRESHOLD, se ordenan de mayor a menor
 * score, y se asignan 1:1 (una licitación ya tomada por un match mejor sale del pool).
 * Evita que dos proyectos distintos reclamen la misma licitación.
 */
export function matchProyectos(licitaciones: Licitacion[], proyectos: ProyectoParaCruce[]): MatchResult[] {
  const todosLosPares: MatchCandidate[] = [];
  for (const proyecto of proyectos) {
    for (const licitacion of licitaciones) {
      todosLosPares.push(scoreMatch(licitacion, proyecto));
    }
  }

  const candidatosPorEncima = todosLosPares
    .filter((c) => c.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  const licitacionesUsadas = new Set<string>();
  const proyectosAsignados = new Map<string, MatchCandidate>();
  const empatesDetectados = new Set<string>();

  for (let i = 0; i < candidatosPorEncima.length; i++) {
    const candidato = candidatosPorEncima[i];
    if (proyectosAsignados.has(candidato.proyectoId) || licitacionesUsadas.has(candidato.licitacionId)) continue;

    // Detectar empate exacto con el siguiente candidato disponible para el mismo proyecto.
    const empatado = candidatosPorEncima.some((otro, j) =>
      j !== i && otro.proyectoId === candidato.proyectoId && otro.score === candidato.score && !licitacionesUsadas.has(otro.licitacionId),
    );
    if (empatado) empatesDetectados.add(candidato.proyectoId);

    proyectosAsignados.set(candidato.proyectoId, candidato);
    licitacionesUsadas.add(candidato.licitacionId);
  }

  return proyectos.map((proyecto) => {
    const asignado = proyectosAsignados.get(proyecto.id);
    const mejorGeneral = todosLosPares
      .filter((c) => c.proyectoId === proyecto.id)
      .sort((a, b) => b.score - a.score)[0] ?? null;

    if (asignado) {
      return {
        proyectoId: proyecto.id,
        licitacionId: asignado.licitacionId,
        score: asignado.score,
        signals: asignado.signals,
        autoLinked: true,
        ambiguous: empatesDetectados.has(proyecto.id),
        bestRejectedCandidate: null,
      };
    }
    return {
      proyectoId: proyecto.id,
      licitacionId: null,
      score: null,
      signals: mejorGeneral?.signals ?? [],
      autoLinked: false,
      ambiguous: false,
      bestRejectedCandidate: mejorGeneral,
    };
  });
}

/** Ordena por estado (Fallo > Construcción > En trabajo > Filtrada > Detectada) — usado
 * como criterio de desempate determinístico si algún día hiciera falta fuera del greedy. */
export function ordenEstadoIndex(estado: string): number {
  const idx = ORDEN_ESTADO.indexOf(estado as (typeof ORDEN_ESTADO)[number]);
  return idx === -1 ? ORDEN_ESTADO.length : idx;
}
