// Genera lib/mock-data.ts a partir de datos REALES de GAIP (data/raw-data.json,
// data/raw-historico.json). No se inventa ningún número: todo lo que el demo
// muestra (conteos, fechas, avances de Gantt, montos) sale de estos archivos.
//
// Uso: node scripts/build-mock-data.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { titleCase, normalizeProcedureName } from '../lib/text-normalization.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const raw = JSON.parse(readFileSync(path.join(root, 'data/raw-data.json'), 'utf8'));
const historico = JSON.parse(readFileSync(path.join(root, 'data/raw-historico.json'), 'utf8'));

// --- 1. Unificar las 5 listas de licitaciones en un solo universo por cod_expediente ---
// Prioridad de estado cuando un expediente aparece en más de una lista:
// fallo > activas (en trabajo) > construccion > filtrados > todos_nuevos (detectada)
const ESTADO_POR_LISTA = {
  fallo: 'Fallo',
  activas: 'En trabajo',
  construccion: 'Construcción',
  filtrados: 'Filtrada',
  todos_nuevos: 'Detectada',
};
const PRIORIDAD = ['fallo', 'activas', 'construccion', 'filtrados', 'todos_nuevos'];

const registrosPorId = new Map(); // cod_expediente -> { item, lista }
let totalRegistrosRecibidos = 0;

for (const lista of PRIORIDAD) {
  const items = raw[lista] ?? [];
  totalRegistrosRecibidos += items.length;
  for (const item of items) {
    const id = item.cod_expediente;
    if (!id) continue;
    const existing = registrosPorId.get(id);
    if (!existing || PRIORIDAD.indexOf(lista) < PRIORIDAD.indexOf(existing.lista)) {
      registrosPorId.set(id, { item, lista });
    }
  }
}

const gantt = raw.gantt ?? {};

function normalizeTareas(id) {
  const g = gantt[id];
  if (!g) return undefined;
  const areaMap = { economica: 'Económica', tecnica: 'Técnica', precio: 'Precio' };
  const nombreMap = {
    economica_elaborar: 'Elaborar propuesta económica',
    economica_presupuesto: 'Integrar presupuesto',
    economica_subir: 'Subir propuesta económica',
    tecnica_elaborar: 'Elaborar propuesta técnica',
    tecnica_reportear: 'Preparar reporte técnico',
    tecnica_subir: 'Subir propuesta técnica',
    precio_interno: 'Validar precio interno',
    precio_aceptacion: 'Aceptación de precio',
  };
  const tareas = [];
  for (const [key, val] of Object.entries(g.tareas ?? {})) {
    if (key.endsWith('_grupo')) continue; // solo indica el grupo responsable, no es una tarea con avance
    if (typeof val.avance !== 'number') continue;
    const [prefix] = key.split('_');
    tareas.push({
      nombre: nombreMap[key] ?? key,
      area: areaMap[prefix] ?? prefix,
      avance: val.avance,
      responsable: val.responsable ?? 'Sin asignar',
    });
  }
  return { fechaAceptacion: g.fecha_aceptacion, fechaVisitaObra: g.fecha_visita_obra, tareas };
}

function fmtFecha(iso) {
  if (!iso || typeof iso !== 'string') return undefined;
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  // Los timestamps de GAIP vienen sin zona horaria (hora local del servidor de origen).
  // Se parsean con regex en vez de `new Date(iso)` para no aplicar una conversión de
  // zona que no corresponde y así no correr el reloj mostrado.
  const isoMatch = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (isoMatch) {
    const [, y, mo, day, hh, mm] = isoMatch;
    const base = `${day} ${meses[Number(mo) - 1]} ${y}`;
    const hasTime = hh !== undefined && !(hh === '00' && mm === '00');
    return hasTime ? `${base} · ${hh}:${mm}` : base;
  }
  // Algunos registros capturados a mano (los "_es_externa": true) usan DD-MM-YY o DD-MM-YYYY.
  const shortMatch = iso.match(/^(\d{2})-(\d{2})-(\d{2}|\d{4})$/);
  if (shortMatch) {
    const [, day, mo, year] = shortMatch;
    const y = year.length === 2 ? `20${year}` : year;
    return `${day} ${meses[Number(mo) - 1]} ${y}`;
  }
  return undefined;
}

// titleCase y normalizeProcedureName viven en lib/text-normalization.ts (compartidas con
// lib/matching-engine.ts — ver import al inicio de este archivo).

const licitaciones = [...registrosPorId.entries()].map(([id, { item, lista }]) => {
  const ganttInfo = normalizeTareas(id);
  return {
    id,
    numero: item.numero_procedimiento,
    nombre: normalizeProcedureName(item.nombre_procedimiento),
    nombreFuente: item.nombre_procedimiento,
    dependencia: item.siglas,
    entidad: titleCase(item.entidad_federativa_contratacion) || 'Por confirmar',
    estado: ESTADO_POR_LISTA[lista],
    estatus: titleCase(item.estatus_alterno ?? item.estatus ?? '') || 'Seguimiento externo',
    tipo: titleCase(item.tipo_contratacion ?? '') || 'Sin clasificar',
    esExterna: Boolean(item._es_externa),
    aclaraciones: fmtFecha(item.fecha_aclaraciones) ?? 'Sin definir',
    apertura: fmtFecha(item.fecha_apertura) ?? 'Sin definir',
    fallo: fmtFecha(item._fecha_fallo),
    nueva: Boolean(item._es_nuevo),
    tareas: ganttInfo?.tareas?.length ? ganttInfo.tareas : undefined,
    fechaAceptacion: ganttInfo?.fechaAceptacion,
    fechaVisitaObra: ganttInfo?.fechaVisitaObra,
  };
});

// Orden estable: por estado (prioridad de atención) y luego por apertura
const ORDEN_ESTADO = ['Fallo', 'En trabajo', 'Construcción', 'Filtrada', 'Detectada'];
licitaciones.sort((a, b) => ORDEN_ESTADO.indexOf(a.estado) - ORDEN_ESTADO.indexOf(b.estado) || a.numero.localeCompare(b.numero));

// --- 2. Pipeline por estado: conteo REAL sobre las listas originales (no sobre únicos) ---
// Refleja el volumen que procesa cada etapa, igual que chart_data/las listas crudas de GAIP.
const ORDEN_PIPELINE = ['Detectada', 'Filtrada', 'En trabajo', 'Construcción', 'Fallo'];
const stages = PRIORIDAD.map((lista) => ({
  label: ESTADO_POR_LISTA[lista],
  value: (raw[lista] ?? []).length,
})).sort((a, b) => ORDEN_PIPELINE.indexOf(a.label) - ORDEN_PIPELINE.indexOf(b.label));

const STAGE_COLOR = {
  Detectada: '#6c7a86',
  Filtrada: '#4b81a3',
  'En trabajo': '#1e9b6c',
  Construcción: '#d6a33a',
  Fallo: '#d76554',
};
const stagesConColor = stages.map((s) => ({ ...s, color: STAGE_COLOR[s.label] }));

// --- 3. Ofertas (universo separado, tal como lo pidió Usuario) ---
const ofertas = (raw.ofertas ?? []).map((o) => ({
  id: o.id,
  empresa: o.empresa,
  proyecto: titleCase(o.nombre_proyecto),
  servicio: titleCase(o.servicio),
  monto: o.monto,
  estatus: o.estatus,
  fechaCierre: fmtFecha(o.fecha_cierre) ?? null,
  fechaLimite: fmtFecha(o.fecha_limite) ?? null,
  fechaSeguimiento: fmtFecha(o.fecha_seguimiento) ?? null,
}));

// --- 4. Notas (antes sueltas del expediente; el demo las liga cuando el texto matchea) ---
const notas = (raw.notas ?? []).map((n) => {
  const texto = (n.texto ?? '').toUpperCase();
  const ligada = licitaciones.find((l) => l.nombre.toUpperCase().includes(texto) || l.dependencia.toUpperCase() === texto);
  return { id: n.id, responsable: n.responsable, texto: n.texto, ligadaA: ligada?.id };
});

// --- 5. Carga de trabajo por responsable: promedio real de avance sobre TODAS las tareas de Gantt ---
// Agrupado por el nombre exacto tal como lo captura GAIP (sin fusionar variantes:
// "JAVIER/BRENDA" y "BRENDA" son entradas distintas en los datos reales — fusionarlas
// sería inventar una relación que el dato no confirma).
const cargaMap = new Map();
for (const l of licitaciones) {
  for (const t of l.tareas ?? []) {
    const key = t.responsable.trim().toUpperCase();
    if (!cargaMap.has(key)) cargaMap.set(key, { total: 0, count: 0 });
    const entry = cargaMap.get(key);
    entry.total += t.avance;
    entry.count += 1;
  }
}
const carga = [...cargaMap.entries()]
  .map(([nombre, { total, count }]) => ({ nombre: titleCase(nombre), avance: Math.round(total / count), asignaciones: count }))
  .sort((a, b) => b.avance - a.avance);

// --- 6. Procesos por entidad (para el widget de barras) ---
const entidadMap = new Map();
for (const l of licitaciones) {
  entidadMap.set(l.entidad, (entidadMap.get(l.entidad) ?? 0) + 1);
}
const porEntidad = [...entidadMap.entries()]
  .map(([name, value]) => ({ name, value }))
  .sort((a, b) => b.value - a.value)
  .slice(0, 6);

// --- 7. Fechas / hitos próximos (fallos con fecha, ordenados cronológicamente) ---
const MESES_IDX = { ene:0,feb:1,mar:2,abr:3,may:4,jun:5,jul:6,ago:7,sep:8,oct:9,nov:10,dic:11 };
function parseFechaCorta(fecha) {
  const [, day, mes, year] = fecha.match(/^(\d{2}) (\w{3}) (\d{4})/) ?? [];
  if (!day) return 0;
  return new Date(Number(year), MESES_IDX[mes], Number(day)).getTime();
}
const hitos = licitaciones
  .filter((l) => l.fallo)
  .map((l) => ({ id: l.id, fecha: l.fallo, dependencia: l.dependencia, nombre: l.nombre }))
  .sort((a, b) => parseFechaCorta(a.fecha) - parseFechaCorta(b.fecha));

// --- 8. Histórico (volumen, no se listan los 3,217, solo se usa como KPI de confiabilidad) ---
const historicoResumen = {
  totalExpedientes: historico.total_expedientes,
  totalSnapshots: historico.total_snapshots,
  generado: historico.generado,
};

// --- 9. Fuentes / metadatos de corte ---
const fuentes = {
  corte: fmtFecha(raw.timestamp) ?? raw.timestamp,
  corteAnterior: fmtFecha(raw.prev_timestamp) ?? raw.prev_timestamp,
  totalListasOrigen: PRIORIDAD.length,
  totalRegistrosRecibidos,
  totalProcesosUnicos: licitaciones.length,
  totalDuplicados: totalRegistrosRecibidos - licitaciones.length,
};

// --- Emitir lib/mock-data.ts ---
const banner = `// GENERADO — no editar a mano.
// Fuente: data/raw-data.json + data/raw-historico.json (datos reales de GAIP,
// corte ${fuentes.corte}). Regenerar con: node scripts/build-mock-data.mjs
`;

const ts = `${banner}
export type Estado = 'Detectada' | 'Filtrada' | 'En trabajo' | 'Construcción' | 'Fallo';

export type Tarea = { nombre: string; area: 'Económica' | 'Técnica' | 'Precio'; avance: number; responsable: string };

export type Licitacion = {
  id: string;
  numero: string;
  nombre: string;
  nombreFuente: string;
  dependencia: string;
  entidad: string;
  estado: Estado;
  estatus: string;
  tipo: string;
  aclaraciones: string;
  apertura: string;
  fallo?: string;
  nueva?: boolean;
  esExterna?: boolean;
  tareas?: Tarea[];
  fechaAceptacion?: string;
  fechaVisitaObra?: string;
};

export const licitaciones: Licitacion[] = ${JSON.stringify(licitaciones, null, 2)};

export const stages: { label: Estado; value: number; color: string }[] = ${JSON.stringify(stagesConColor, null, 2)};

export const ofertas = ${JSON.stringify(ofertas, null, 2)};

// Se mantiene 'oferta' (singular) para compatibilidad con la UI actual: única oferta activa al corte.
export const oferta = ofertas[0];

export type Nota = { id: string; responsable: string; texto: string; ligadaA?: string };

export const notas: Nota[] = ${JSON.stringify(notas, null, 2)};

export const carga = ${JSON.stringify(carga, null, 2)};

export const porEntidad = ${JSON.stringify(porEntidad, null, 2)};

export const hitos = ${JSON.stringify(hitos, null, 2)};

export const historicoResumen = ${JSON.stringify(historicoResumen, null, 2)};

export const fuentes = ${JSON.stringify(fuentes, null, 2)};
`;

writeFileSync(path.join(root, 'lib/mock-data.ts'), ts, 'utf8');

console.log('lib/mock-data.ts generado desde datos reales.');
console.log(`  Licitaciones únicas: ${licitaciones.length} (de ${totalRegistrosRecibidos} registros en ${PRIORIDAD.length} listas)`);
console.log(`  Con Gantt: ${licitaciones.filter((l) => l.tareas).length}`);
console.log(`  Ofertas: ${ofertas.length}`);
console.log(`  Notas: ${notas.length}`);
console.log(`  Responsables con carga: ${carga.length}`);
console.log(`  Histórico: ${historicoResumen.totalExpedientes} expedientes / ${historicoResumen.totalSnapshots} snapshots`);
