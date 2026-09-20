// EJEMPLO ILUSTRATIVO — datos inventados para demo de concepto, NO son datos reales del cliente.
// El cruce con expedientes reales de lib/mock-data.ts ya NO es un FK a mano — lo calcula
// lib/matching-engine.ts en runtime, por score de similitud (número de procedimiento,
// nombre, dependencia, fechas), igual que tendría que hacerlo con datos reales del cliente
// sin un ID compartido. Ver docs/mapeo-cruce-licitaciones-proyectos.md y
// docs/ejemplo-ilustrativo-cruce.md. NO editar lib/mock-data.ts para agregar esto — ese
// archivo es GENERADO desde datos reales de GAIP y nunca debe mezclarse con datos
// inventados.
//
// numeroProcedimiento abajo se pobló con el numero real del expediente correspondiente
// (dato que en producción vendría del sistema externo del cliente, no de aquí) — es la
// señal que el motor usa para reconocer el cruce, no una referencia directa al id.
//
// Regla de coherencia con los datos reales (verificada contra lib/mock-data.ts):
// solo se describen proyectos cuyo expediente de origen tiene `estado` real 'Fallo' o
// 'Construcción' con fallo <= corte (10 sep 2026 08:30, igual que fuentes.corte) — nunca
// uno cuyo fallo real todavía no ocurre, porque no puede existir un "proyecto adjudicado"
// de algo que GAIP todavía no reporta como ganado. Todas las fechas de contrato,
// facturas y pagos caen entre el inicio de contrato y el corte, nunca después.

import { licitaciones } from '@/lib/mock-data';
import { matchProyectos, MATCH_THRESHOLD, type MatchResult, type MatchSignal } from '@/lib/matching-engine';

export { MATCH_THRESHOLD, type MatchResult, type MatchSignal };

export type ProjectStatus = 'activo' | 'en_pausa' | 'en_riesgo' | 'terminado' | 'cancelado';
export type InvoiceStatus = 'pendiente' | 'facturado' | 'pagado';
export type BondType = 'cumplimiento' | 'anticipo' | 'vicios_ocultos' | 'otro';
export type BondStatus = 'vigente' | 'por_vencer' | 'vencida' | 'liberada';

export type ProyectoIlustrativo = {
  id: string;
  numeroProcedimiento?: string; // señal para el motor de cruce, no una FK directa
  name: string;
  client: string;
  status: ProjectStatus;
  progress: number; // avance físico de obra, distinto del avance de Gantt de licitación
  coordinator: string;
  contractAmount: number;
  contractStart: string;
  contractEnd: string;
};

export type AddendaIlustrativa = { id: string; proyectoId: string; number: number; amount: number; date: string };
export type InvoiceIlustrativa = { id: string; proyectoId: string; folio: string; amount: number; status: InvoiceStatus; issueDate: string };
export type PaymentIlustrativo = { id: string; proyectoId: string; amount: number; paymentDate: string };
export type BondIlustrativo = { id: string; proyectoId: string; type: BondType; insurer: string; policyNumber: string; expiryDate: string; status: BondStatus };
export type WeeklyGoalIlustrativo = { id: string; proyectoId: string; weekStart: string; objetivo: string; completadoPct: number };

export const proyectos: ProyectoIlustrativo[] = [
  {
    id: 'proj-puente-xuchipantla',
    numeroProcedimiento: 'LO-09-210-009000999-N-925-2026', // real: expediente E-2026-00099528, estado 'Construcción', sin fallo (ya adjudicado antes del corte)
    name: 'Reconstrucción del Puente "Xuchipantla"',
    client: 'SICT',
    status: 'activo',
    progress: 78,
    coordinator: 'JAVIER/BRENDA',
    contractAmount: 9_150_000,
    contractStart: '15 jun 2026',
    contractEnd: '15 dic 2026',
  },
  {
    id: 'proj-asiponaguaymas',
    numeroProcedimiento: 'LO-13-J2Z-013J2Z999-N-15-2026', // real: expediente E-2026-00093484, estado 'Fallo', fallo 11 sep 2026
    name: 'Control de Calidad de la Obra — Mejoramiento Etapa 2',
    client: 'ASIPONAGUAYMAS',
    status: 'en_riesgo',
    progress: 22,
    coordinator: 'LUIS',
    contractAmount: 15_800_000,
    contractStart: '15 jul 2026',
    contractEnd: '15 ene 2027',
  },
  {
    id: 'proj-puente-las-pilas',
    numeroProcedimiento: 'LO-09-210-009000999-N-924-2026', // real: expediente E-2026-00099527, estado 'Construcción'
    name: 'Construcción del Puente "Las Pilas"',
    client: 'SICT',
    status: 'activo',
    progress: 62,
    coordinator: 'LUIS',
    contractAmount: 24_100_000,
    contractStart: '10 jun 2026',
    contractEnd: '10 jun 2027',
  },
  {
    id: 'proj-tramo-8-golfo',
    numeroProcedimiento: 'LA-06-G1C-006G1C003-N-36-2026', // real: expediente E-2026-00091321, estado 'Construcción', BANOBRAS
    name: 'Supervisión Tramo 8 — Corredor Golfo México',
    client: 'BANOBRAS',
    status: 'activo',
    progress: 34,
    coordinator: 'ALICIA',
    contractAmount: 31_200_000,
    contractStart: '01 jun 2026',
    contractEnd: '01 dic 2027',
  },
  {
    id: 'proj-tramo-i-ferroviario',
    numeroProcedimiento: 'LO-09-JZO-009JZO001-I-26-2026', // real: expediente E-2026-00076620, estado 'Construcción', ATTRAPI
    name: 'Construcción y Diseño 68 km — Tramo I Ferroviario',
    client: 'ATTRAPI',
    status: 'activo',
    progress: 9,
    coordinator: 'Sin asignar',
    contractAmount: 88_400_000,
    contractStart: '20 ago 2026',
    contractEnd: '20 ago 2029',
  },
  {
    id: 'proj-agua-potable-xicotepec',
    numeroProcedimiento: 'LO-16-B00-016B00985-N-167-2026', // real: expediente E-2026-00098796, estado 'Construcción', CONAGUA
    name: 'Reconstrucción Sistema de Agua Potable — Xicotepec, Puebla',
    client: 'CONAGUA',
    status: 'activo',
    progress: 55,
    coordinator: 'BRENDA',
    contractAmount: 5_900_000,
    contractStart: '01 jul 2026',
    contractEnd: '01 ene 2027',
  },
];

export const addendas: AddendaIlustrativa[] = [
  { id: 'add-xuchipantla-1', proyectoId: 'proj-puente-xuchipantla', number: 1, amount: 1_200_000, date: '20 ago 2026' },
];

export const invoices: InvoiceIlustrativa[] = [
  { id: 'inv-xuchipantla-1', proyectoId: 'proj-puente-xuchipantla', folio: 'F-2026-0742', amount: 5_500_000, status: 'pagado', issueDate: '30 jul 2026' },
  { id: 'inv-xuchipantla-2', proyectoId: 'proj-puente-xuchipantla', folio: 'F-2026-0855', amount: 2_573_000, status: 'facturado', issueDate: '05 sep 2026' },
  { id: 'inv-asiponaguaymas-1', proyectoId: 'proj-asiponaguaymas', folio: 'F-2026-0812', amount: 1_200_000, status: 'facturado', issueDate: '28 ago 2026' },
  { id: 'inv-puente-las-pilas-1', proyectoId: 'proj-puente-las-pilas', folio: 'F-2026-0700', amount: 8_800_000, status: 'pagado', issueDate: '15 jul 2026' },
  { id: 'inv-puente-las-pilas-2', proyectoId: 'proj-puente-las-pilas', folio: 'F-2026-0812', amount: 6_100_000, status: 'facturado', issueDate: '02 sep 2026' },
  { id: 'inv-tramo-8-1', proyectoId: 'proj-tramo-8-golfo', folio: 'F-2026-0790', amount: 7_400_000, status: 'facturado', issueDate: '20 ago 2026' },
  { id: 'inv-agua-xicotepec-1', proyectoId: 'proj-agua-potable-xicotepec', folio: 'F-2026-0770', amount: 3_200_000, status: 'pagado', issueDate: '10 ago 2026' },
  { id: 'inv-agua-xicotepec-2', proyectoId: 'proj-agua-potable-xicotepec', folio: 'F-2026-0850', amount: 1_100_000, status: 'facturado', issueDate: '04 sep 2026' },
];

export const payments: PaymentIlustrativo[] = [
  { id: 'pay-xuchipantla-1', proyectoId: 'proj-puente-xuchipantla', amount: 5_500_000, paymentDate: '10 ago 2026' },
  { id: 'pay-xuchipantla-2', proyectoId: 'proj-puente-xuchipantla', amount: 1_745_000, paymentDate: '08 sep 2026' },
  { id: 'pay-asiponaguaymas-1', proyectoId: 'proj-asiponaguaymas', amount: 480_000, paymentDate: '05 sep 2026' },
  { id: 'pay-puente-las-pilas-1', proyectoId: 'proj-puente-las-pilas', amount: 8_800_000, paymentDate: '25 jul 2026' },
  { id: 'pay-tramo-8-1', proyectoId: 'proj-tramo-8-golfo', amount: 4_100_000, paymentDate: '30 ago 2026' },
  { id: 'pay-agua-xicotepec-1', proyectoId: 'proj-agua-potable-xicotepec', amount: 3_200_000, paymentDate: '18 ago 2026' },
];

// Estatus calculado igual que el sistema real del cliente: vencida si ya pasó, por_vencer
// si faltan 14 días o menos, vigente en cualquier otro caso (ver docs/mapeo-cruce...).
export const bonds: BondIlustrativo[] = [
  { id: 'bond-xuchipantla', proyectoId: 'proj-puente-xuchipantla', type: 'cumplimiento', insurer: 'Fianzas Guardiana', policyNumber: 'FG-2026-1183', expiryDate: '24 sep 2026', status: 'por_vencer' },
  { id: 'bond-asiponaguaymas', proyectoId: 'proj-asiponaguaymas', type: 'cumplimiento', insurer: 'Fianzas Guardiana', policyNumber: 'FG-2026-1190', expiryDate: '20 sep 2026', status: 'por_vencer' },
  { id: 'bond-puente-las-pilas', proyectoId: 'proj-puente-las-pilas', type: 'cumplimiento', insurer: 'Afianzadora Insurgentes', policyNumber: 'AI-2026-4471', expiryDate: '10 jun 2027', status: 'vigente' },
  { id: 'bond-tramo-8', proyectoId: 'proj-tramo-8-golfo', type: 'cumplimiento', insurer: 'Afianzadora Insurgentes', policyNumber: 'AI-2026-4480', expiryDate: '01 dic 2027', status: 'vigente' },
  { id: 'bond-tramo-i-ferroviario', proyectoId: 'proj-tramo-i-ferroviario', type: 'anticipo', insurer: 'Afianzadora Insurgentes', policyNumber: 'AI-2026-4491', expiryDate: '20 ago 2027', status: 'vigente' },
  { id: 'bond-agua-xicotepec', proyectoId: 'proj-agua-potable-xicotepec', type: 'cumplimiento', insurer: 'Fianzas Guardiana', policyNumber: 'FG-2026-1201', expiryDate: '01 ene 2027', status: 'vigente' },
];

export const weeklyGoals: WeeklyGoalIlustrativo[] = [
  { id: 'wg-xuchipantla-1', proyectoId: 'proj-puente-xuchipantla', weekStart: '01 sep 2026', objetivo: 'Cerrar avance de losa de cimentación', completadoPct: 100 },
  { id: 'wg-xuchipantla-2', proyectoId: 'proj-puente-xuchipantla', weekStart: '08 sep 2026', objetivo: 'Instalación eléctrica primer nivel', completadoPct: 80 },
  { id: 'wg-puente-1', proyectoId: 'proj-puente-las-pilas', weekStart: '08 sep 2026', objetivo: 'Colado de pilas centrales', completadoPct: 90 },
  { id: 'wg-tramo8-1', proyectoId: 'proj-tramo-8-golfo', weekStart: '01 sep 2026', objetivo: 'Levantamiento topográfico del tramo', completadoPct: 60 },
];

// --- Cálculos derivados (puros, sobre los datos ilustrativos de arriba) ---

export function proyectoPorId(id: string): ProyectoIlustrativo {
  const found = proyectos.find((p) => p.id === id);
  if (!found) throw new Error(`Proyecto ilustrativo no encontrado: ${id}`);
  return found;
}

// Resultado del motor de cruce fuzzy (lib/matching-engine.ts) calculado una vez a nivel de
// módulo — los componentes lo consumen directo en vez de recalcularlo. Reemplaza el join
// por `licitacionId` hardcodeado que existía en la Fase 1.
export const matchResults: MatchResult[] = matchProyectos(licitaciones, proyectos);

export function matchResultPorProyecto(proyectoId: string): MatchResult | undefined {
  return matchResults.find((r) => r.proyectoId === proyectoId);
}

export function montoTotal(proyectoId: string): number {
  const contrato = proyectoPorId(proyectoId).contractAmount;
  const addendasMonto = addendas.filter((a) => a.proyectoId === proyectoId).reduce((sum, a) => sum + a.amount, 0);
  return contrato + addendasMonto;
}

export function totalFacturado(proyectoId: string): number {
  return invoices.filter((i) => i.proyectoId === proyectoId && (i.status === 'facturado' || i.status === 'pagado')).reduce((sum, i) => sum + i.amount, 0);
}

export function totalPagado(proyectoId: string): number {
  return payments.filter((p) => p.proyectoId === proyectoId).reduce((sum, p) => sum + p.amount, 0);
}

export type CobranzaConsolidada = {
  montoTotal: number;
  facturado: number;
  pagado: number;
  pendientePorCobrar: number;
  porEjercer: number;
};

export function cobranzaConsolidada(): CobranzaConsolidada {
  const montoTotalPortafolio = proyectos.reduce((sum, p) => sum + montoTotal(p.id), 0);
  const facturado = proyectos.reduce((sum, p) => sum + totalFacturado(p.id), 0);
  const pagado = proyectos.reduce((sum, p) => sum + totalPagado(p.id), 0);
  return {
    montoTotal: montoTotalPortafolio,
    facturado,
    pagado,
    pendientePorCobrar: facturado - pagado,
    porEjercer: montoTotalPortafolio - facturado,
  };
}

export type SemaforoDesfase = 'alineado' | 'amarillo' | 'rojo';

// Compara avance físico (obra) contra % facturado del contrato — el cruce que expone
// si se factura al ritmo real de avance. Ver docs/ejemplo-ilustrativo-cruce.md §3.2.
export function semaforoDesfase(proyectoId: string): { desfase: number; nivel: SemaforoDesfase } {
  const proyecto = proyectoPorId(proyectoId);
  const total = montoTotal(proyectoId);
  const pctFacturado = total > 0 ? (totalFacturado(proyectoId) / total) * 100 : 0;
  const desfase = Math.abs(proyecto.progress - pctFacturado);
  const nivel: SemaforoDesfase = desfase < 10 ? 'alineado' : desfase <= 25 ? 'amarillo' : 'rojo';
  return { desfase: Math.round(desfase * 10) / 10, nivel };
}

// Fecha de corte fija del demo, igual que fuentes.corte en lib/mock-data.ts — todas las
// fechas ilustrativas de este archivo (contratos, facturas, pagos) caen en o antes de
// esta fecha, nunca después, para no mostrar eventos "futuros" respecto al corte.
const FECHA_CORTE = new Date(2026, 8, 10); // 10 sep 2026

const MESES_IDX: Record<string, number> = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 };

function parseFechaCorta(fecha: string): Date {
  const [, day, mesRaw, year] = fecha.match(/^(\d{2}) (\w{3}) (\d{4})/) ?? [];
  const mes = mesRaw?.toLowerCase();
  const mesIdx = mes ? MESES_IDX[mes] : undefined;
  if (!day || mesIdx === undefined) {
    throw new Error(`Fecha ilustrativa con formato inesperado: "${fecha}" (se esperaba "DD mmm YYYY")`);
  }
  return new Date(Number(year), mesIdx, Number(day));
}

export function diasParaVencer(bond: BondIlustrativo): number {
  const expiry = parseFechaCorta(bond.expiryDate);
  return Math.round((expiry.getTime() - FECHA_CORTE.getTime()) / 86_400_000);
}

// El cruce insignia (docs/ejemplo-ilustrativo-cruce.md §3.3): margen entre el vencimiento
// de la fianza (ilustrativo) y el fallo real de la licitación en GAIP (dato real, no
// inventado) — no entre el vencimiento y "hoy". Recibe el string de fallo tal cual lo
// entrega lib/mock-data.ts (Licitacion.fallo, formato "DD mmm YYYY").
export function diasEntreFallo(bond: BondIlustrativo, fallo: string | undefined): number | null {
  if (!fallo) return null;
  const expiry = parseFechaCorta(bond.expiryDate);
  const falloDate = parseFechaCorta(fallo);
  return Math.round((expiry.getTime() - falloDate.getTime()) / 86_400_000);
}

export const bondsPorVencer = bonds.filter((b) => b.status === 'por_vencer' || b.status === 'vencida').sort((a, b) => diasParaVencer(a) - diasParaVencer(b));

// Guarda contra que el motor de cruce (lib/matching-engine.ts) deje de encontrar alguna
// de las 6 vinculaciones esperadas — p.ej. si lib/mock-data.ts se regenera y cambia el
// numero/nombre/dependencia del expediente correspondiente. Ya no valida un FK estático:
// corre el algoritmo real y falla fuerte en dev si el score cae por debajo del umbral
// para cualquiera de estos proyectos, igual de estricto que el guard anterior pero
// validando el algoritmo en vez de un id hardcodeado.
if (process.env.NODE_ENV !== 'production') {
  for (const r of matchResults) {
    if (!r.autoLinked) {
      throw new Error(
        `mock-data-finanzas-obra: el motor de cruce ya no vincula automáticamente el proyecto "${r.proyectoId}" ` +
        `(mejor score encontrado: ${r.bestRejectedCandidate?.score.toFixed(3) ?? 'ninguno'}). ` +
        'Revisa si lib/mock-data.ts cambió el numero/nombre/dependencia del expediente esperado, o el numeroProcedimiento en este archivo.',
      );
    }
  }
}
