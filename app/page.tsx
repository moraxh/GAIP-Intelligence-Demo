'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronLeft,
  ChevronRight, Database, FileStack, Filter, FlaskConical, Gauge, GitMerge, Lock,
  MapPin, Search, TrendingUp, Users, X, ArrowRight,
  Building2, Wallet, HardHat, UserRound, MessageCircle, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  carga, fuentes, hitos, historicoResumen, licitaciones, oferta, ofertas,
  porEntidad, stages, type Estado, type Licitacion, type Tarea,
} from '@/lib/mock-data';
import { FinanzasView } from '@/components/dashboard/finanzas-view';
import { ObraView } from '@/components/dashboard/obra-view';
import { MatchingEngineView } from '@/components/dashboard/matching-engine-view';
import {
  bondsPorVencer, cobranzaConsolidada, diasEntreFallo, proyectoPorId, proyectos, semaforoDesfase,
  matchResultPorProyecto, matchResultPorLicitacion, matchResults, riesgoPortafolio, type RiesgoNivel,
} from '@/lib/mock-data-finanzas-obra';
import { fmtMXN, licitacionPorId as licitacionPorIdSafe } from '@/lib/mock-data-helpers';

type View = 'panorama' | 'licitaciones' | 'ofertas' | 'detalle' | 'finanzas' | 'obra' | 'matching';
type RoutedView = Exclude<View, 'detalle'>;

const viewRoutes: Record<RoutedView, string> = {
  panorama: '/',
  licitaciones: '/licitaciones',
  ofertas: '/ofertas',
  finanzas: '/finanzas',
  obra: '/obra',
  matching: '/cruce',
};
type ChatKey = 'vence' | 'avance' | 'oferta' | 'cruce' | 'sinArrancar' | 'ofertaVsLicitacion' | 'pipeline' | 'moneda' | 'fianzaVence' | 'cobranza' | 'avanceObra' | 'cruceAutomatico' | 'cruceSinVincular';
type ModelContext = { registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> };

// --- Pieza 5: barra de módulos de empresa. Licitaciones es UN módulo conectado; RH/Finanzas/Obra
// son módulos aparte, no fuentes de datos — comparten el mismo patrón visual "gris = no conectado"
// que las fuentes del mapa, pero viven a nivel de producto/empresa, no de dato.
type ModuloKey = 'licitaciones' | 'rh' | 'finanzas' | 'obra';
const moduloInfo: Record<ModuloKey, { label: string; icon: typeof Building2 }> = {
  licitaciones: { label: 'Licitaciones', icon: FileStack },
  rh: { label: 'RH', icon: UserRound },
  finanzas: { label: 'Finanzas', icon: Wallet },
  obra: { label: 'Obra', icon: HardHat },
};
// RH reusa el diálogo "no conectado" ya construido para el mapa de fuentes — mismas
// reglas de honestidad visual: sin salida propia, solo el estado gris. Finanzas/Obra
// pasaron a "vista de concepto" (ver FlaskConical en ModuleBar): tienen vista propia,
// pero con datos ilustrativos, no reales — ver lib/mock-data-finanzas-obra.ts.
const modulosNoConectados: { key: string; label: string; hoy: string; con: string }[] = [
  {
    key: 'rh',
    label: 'RH',
    hoy: `Hoy sabes: ${carga.reduce((s, c) => s + c.asignaciones, 0)} tareas repartidas entre ${carga.length} personas, por el Excel de Gantt.`,
    con: 'Con el módulo de RH verías la capacidad real del equipo, quién está disponible para tomar más trabajo, y dónde hace falta contratar.',
  },
];

// Un solo estado por módulo (en vez de dos arrays que había que mantener en sync):
// evita combinaciones imposibles como "ilustrativo pero no conectado".
type ModuloEstado = 'conectado' | 'ilustrativo' | 'no_conectado';
const MODULO_ESTADO: Record<ModuloKey, ModuloEstado> = {
  licitaciones: 'conectado',
  rh: 'no_conectado',
  finanzas: 'ilustrativo',
  obra: 'ilustrativo',
};

const entityBars = porEntidad.slice(0, 5);
const fallosFechadosPorId = new Map(hitos.map(({ id, fecha }) => [id, fecha]));

const licitacionPorId = (id: string) => licitaciones.find((item) => item.id === id)!;

const lagosDeMoreno = licitacionPorId('XLS-LO09217009217002N1052026');
const tramoII = licitacionPorId('E-2026-00080053');
const tramoIIAvance = Math.round(
  (tramoII.tareas!.reduce((sum, t) => sum + t.avance, 0) / tramoII.tareas!.length) * 10,
) / 10;
const tramoIITareaTop = [...tramoII.tareas!].sort((a, b) => b.avance - a.avance)[0];
const tramoIIPendientes = tramoII.tareas!.filter((t) => t.avance === 0).length;
const tramoIIResponsables = Array.from(new Set(tramoII.tareas!.map((t) => t.responsable))).join(', ');

// Expedientes con Gantt activo pero sin ninguna tarea iniciada todavía (0% en todas).
const expedientesConTareasArr = licitaciones.filter((item) => item.tareas?.length);
const expedientesSinArrancar = expedientesConTareasArr.filter((item) => item.tareas!.every((t) => t.avance === 0));
const expedienteSinArrancarDestacado = expedientesSinArrancar[0];

const chatAnswers: Record<ChatKey, { question: string; answer: string; source: string; tender?: Licitacion }> = {
  vence: {
    question: '¿Qué necesita mi atención hoy?',
    answer: `Hay ${hitos.length} decisiones próximas que conviene revisar. En orden de fecha: ${hitos.map((h) => `${h.dependencia}, el ${h.fecha}`).join('; ')}.`,
    source: 'ComprasMX · Fechas de fallo',
    tender: lagosDeMoreno,
  },
  avance: {
    question: '¿Cómo vamos con el proyecto del Tramo II?',
    answer: `El proyecto lleva ${tramoIIAvance}% de avance. Lo más adelantado es “${tramoIITareaTop.nombre}” (${tramoIITareaTop.avance}%) y todavía hay ${tramoIIPendientes} pendientes sin iniciar. El equipo a cargo es ${tramoIIResponsables}.`,
    source: 'Excel de Gantt · Seguimiento de tareas',
    tender: tramoII,
  },
  oferta: {
    question: '¿En qué estamos trabajando con KIVA?',
    answer: `Estamos dando seguimiento a ${oferta.proyecto}, una propuesta de ${oferta.servicio.toLowerCase()} por ${oferta.monto}. Actualmente se encuentra “${oferta.estatus}”.`,
    source: 'Excel de Ofertas · Registro comercial',
  },
  cruce: {
    question: '¿Quién necesita apoyo esta semana?',
    answer: `El proyecto de ${lagosDeMoreno.dependencia} tiene una decisión próxima, el ${lagosDeMoreno.fallo}. ${lagosDeMoreno.tareas!.find((t) => t.area === 'Económica')?.responsable} lleva la parte económica, ${lagosDeMoreno.tareas!.find((t) => t.area === 'Técnica')?.responsable} la técnica y ${lagosDeMoreno.tareas!.find((t) => t.area === 'Precio')?.responsable} la revisión de precios. Conviene confirmar con ellos si tienen algún bloqueo.`,
    source: 'ComprasMX + Excel de Gantt',
    tender: lagosDeMoreno,
  },
  sinArrancar: {
    question: '¿Qué expedientes tienen su Gantt sin arrancar?',
    answer: expedientesSinArrancar.length
      ? `Hay ${expedientesSinArrancar.length} expediente${expedientesSinArrancar.length === 1 ? '' : 's'} con 0% de avance en todas sus tareas: ${expedientesSinArrancar.map((item) => `${item.dependencia} (${item.numero})`).join('; ')}. ${expedienteSinArrancarDestacado ? `El de ${expedienteSinArrancarDestacado.dependencia} es el más urgente si su fallo ya está próximo.` : ''}`
      : 'Ahora mismo no hay ningún expediente con todas sus tareas en 0%; todos los que tienen Gantt activo ya registran algo de avance.',
    source: 'Excel de Gantt · Seguimiento de tareas',
    tender: expedienteSinArrancarDestacado,
  },
  ofertaVsLicitacion: {
    question: '¿Cuál es la diferencia entre mis licitaciones y mis ofertas?',
    answer: `Licitaciones = procesos públicos en los que GAIP concursa (${fuentes.totalProcesosUnicos} procesos únicos en el pipeline actual: detectadas, filtradas, en trabajo, en construcción o con fallo). Ofertas = propuestas comerciales que GAIP genera directamente hacia un cliente (por ahora ${ofertas.length}: ${oferta.proyecto} con ${oferta.empresa}). Viven separadas en el sistema — nunca se mezclan en la misma lista ni en los mismos filtros.`,
    source: 'ComprasMX + Excel de Ofertas',
  },
  pipeline: {
    question: 'Dame un resumen general del pipeline',
    answer: `Ahora mismo GAIP tiene ${fuentes.totalRegistrosRecibidos} registros en el pipeline (sin contar las ${fuentes.totalInvitacionesSinProcesar} invitaciones aún sin procesar): ${stages.map((s) => `${s.value} en ${s.label.toLowerCase()}`).join(', ')}. Además, respaldando todo esto, hay un histórico de ${historicoResumen.totalExpedientes.toLocaleString('es-MX')} expedientes ya analizados por el sistema en los últimos ${historicoResumen.totalSnapshots} cortes.`,
    source: 'ComprasMX · Corte ' + fuentes.corte,
  },
  moneda: {
    question: '¿En qué moneda está la oferta de KIVA?',
    answer: `La fuente no especifica la moneda del monto de ${oferta.proyecto} (${oferta.monto}) — el Excel de Ofertas trae la cifra sin esa columna. No lo inventamos: conviene confirmarlo directamente en la fuente comercial antes de reportarlo.`,
    source: 'Excel de Ofertas · Registro comercial',
  },
  fianzaVence: {
    question: '¿Alguna fianza está por vencer?',
    answer: bondsPorVencer.length
      ? (() => {
          const bond = bondsPorVencer[0];
          const proyecto = proyectoPorId(bond.proyectoId);
          const match = matchResultPorProyecto(bond.proyectoId);
          const licitacion = match?.licitacionId ? licitacionPorIdSafe(match.licitacionId) : undefined;
          const dias = diasEntreFallo(bond, licitacion?.fallo);
          return `Sí — la más próxima es la de ${proyecto.name} (${proyecto.client}): vence el ${bond.expiryDate}${dias !== null ? `, ${dias} días después del fallo registrado en GAIP (${licitacion?.fallo})` : ''}. Es el margen más corto del portafolio ilustrativo.`;
        })()
      : 'En este ejemplo ilustrativo ninguna fianza está por vencer.',
    source: 'Vista de concepto · Finanzas (datos ilustrativos, no reales)',
  },
  cobranza: {
    question: '¿Cómo va la cobranza del portafolio?',
    answer: (() => {
      const c = cobranzaConsolidada();
      return `Del monto total contratado (${fmtMXN(c.montoTotal)}), se ha facturado ${fmtMXN(c.facturado)} y cobrado ${fmtMXN(c.pagado)}. Queda ${fmtMXN(c.pendientePorCobrar)} pendiente por cobrar y ${fmtMXN(c.porEjercer)} por ejercer.`;
    })(),
    source: 'Vista de concepto · Finanzas (datos ilustrativos, no reales)',
  },
  avanceObra: {
    question: '¿El avance de obra coincide con lo facturado?',
    answer: (() => {
      const peor = proyectos
        .map((p) => ({ proyecto: p, ...semaforoDesfase(p.id) }))
        .sort((a, b) => b.desfase - a.desfase)[0];
      if (!peor || peor.nivel === 'alineado') return `En este ejemplo ilustrativo, el avance físico y lo facturado están alineados en la mayoría del portafolio (diferencia menor a 10 puntos).`;
      return `El caso con mayor desfase es ${peor.proyecto.name} (${peor.proyecto.client}): hay ${peor.desfase} puntos de diferencia entre su avance físico (${peor.proyecto.progress}%) y lo facturado del contrato. Conviene revisarlo antes de la próxima estimación.`;
    })(),
    source: 'Vista de concepto · Obra (datos ilustrativos, no reales)',
  },
  cruceAutomatico: {
    question: '¿Cuántos proyectos se lograron cruzar automáticamente?',
    answer: (() => {
      const vinculados = matchResults.filter((r) => r.autoLinked).length;
      return `El motor de cruce vinculó automáticamente ${vinculados} de ${proyectos.length} proyectos con su licitación de origen, con un umbral mínimo de confianza del ${Math.round(0.85 * 100)}%. Ningún ID compartido conecta las dos fuentes — la señal más fuerte fue el número de procedimiento coincidiendo exacto entre ambas.`;
    })(),
    source: 'Motor de cruce · lib/matching-engine.ts (recalculado en cada carga)',
  },
  cruceSinVincular: {
    question: '¿Qué expedientes quedaron sin vincular y por qué?',
    answer: (() => {
      const sinVincular = matchResults.filter((r) => !r.autoLinked);
      if (sinVincular.length === 0) return 'Todos los proyectos del ejemplo se lograron vincular automáticamente con score arriba del umbral.';
      const detalle = sinVincular.map((r) => {
        const proyecto = proyectos.find((p) => p.id === r.proyectoId);
        const mejorScore = r.bestRejectedCandidate ? `${Math.round(r.bestRejectedCandidate.score * 100)}%` : 'ninguno';
        return `“${proyecto?.name}” (mejor candidato encontrado: ${mejorScore} de confianza)`;
      }).join('; ');
      return `${sinVincular.length} proyecto(s) quedaron sin vincular porque ningún candidato superó el umbral del 85%: ${detalle}. El motor prefiere no adivinar antes que forzar un cruce de baja confianza.`;
    })(),
    source: 'Motor de cruce · lib/matching-engine.ts (recalculado en cada carga)',
  },
};

// --- Pieza 3: Capacidad vs. Demanda — el cruce Gantt x fechas de fallo que ComprasMX no puede hacer. ---
// Caso real: ALICIA tiene tareas abiertas en dos expedientes con fallo próximo (Tramo II 08-oct, Tramo III 30-sep);
// LUIS tiene tres tareas abiertas, en un expediente sin fecha de fallo registrada todavía (82km).
const tramoIICapacidad = licitacionPorId('E-2026-00080053');
const tramoIIICapacidad = licitacionPorId('XLS-LO09JZO009JZO001N342026');
const km82Capacidad = licitacionPorId('E-2026-00084041');

const aliciaAbiertasTramoII = tramoIICapacidad.tareas!.filter((t) => t.responsable === 'ALICIA' && t.avance < 100);
const aliciaAbiertasTramoIII = tramoIIICapacidad.tareas!.filter((t) => t.responsable === 'ALICIA' && t.avance < 100);
const luisAbiertas82km = km82Capacidad.tareas!.filter((t) => t.responsable === 'LUIS' && t.avance < 100);
const luisAbiertas82kmAvance = luisAbiertas82km.length
  ? Math.round(luisAbiertas82km.reduce((sum, t) => sum + t.avance, 0) / luisAbiertas82km.length)
  : 0;
const aliciaCarga = carga.find((c) => c.nombre === 'Alicia')!;
const luisCarga = carga.find((c) => c.nombre === 'Luis')!;

const capacidadCaso = {
  sobrecargada: { nombre: 'ALICIA', carga: aliciaCarga, expedientes: [
    { item: tramoIICapacidad, tareas: aliciaAbiertasTramoII },
    { item: tramoIIICapacidad, tareas: aliciaAbiertasTramoIII },
  ] },
  destino: { nombre: 'LUIS', carga: luisCarga, expediente: { item: km82Capacidad, tareas: luisAbiertas82km } },
  // La tarea propuesta a mover: la económica de menor avance en Tramo III (0%), donde ALICIA aún no arranca.
  tareaAMover: tramoIIICapacidad.tareas!.find((t) => t.responsable === 'ALICIA' && t.nombre === 'Elaborar propuesta económica')!,
};

function StateBadge({ state }: { state: Estado }) {
  return <span className={`state-badge state-${state.toLowerCase().replace(' ', '-')}`}>{state}</span>;
}

export default function Home({ initialView = 'panorama' }: { initialView?: RoutedView }) {
  const router = useRouter();
  const [view, setView] = useState<View>(initialView);
  const [selected, setSelected] = useState<Licitation | null>(null);
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<'Todos' | Estado>('Todos');
  const [entityFilter, setEntityFilter] = useState('Todas');
  const [tenderPage, setTenderPage] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [onlyHitos, setOnlyHitos] = useState(false);

  const [moduloAbierto, setModuloAbierto] = useState<string | null>(null);

  const openDetail = (item: Licitacion) => { setSelected(item); setView('detalle'); };
  const navigate = useCallback((next: View) => {
    setView(next);
    if (next !== 'detalle') {
      setSelected(null);
      router.push(viewRoutes[next]);
    }
    if (next !== 'licitaciones') setOnlyHitos(false);
  }, [router]);
  const openHitos = () => { setOnlyHitos(true); setQuery(''); setStateFilter('Todos'); setEntityFilter('Todas'); setTenderPage(0); navigate('licitaciones'); };
  const moduloActivo: ModuloKey = view === 'finanzas' ? 'finanzas' : view === 'obra' ? 'obra' : 'licitaciones';
  const modulosGris = modulosNoConectados.find((m) => m.key === moduloAbierto);
  const hitosIds = useMemo(() => new Set(hitos.map((h) => h.id)), []);

  const filtered = useMemo(() => licitaciones.filter((item) => {
    const text = `${item.numero} ${item.nombre} ${item.dependencia} ${item.entidad}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (stateFilter === 'Todos' || item.estado === stateFilter) && (entityFilter === 'Todas' || item.entidad === entityFilter) && (!onlyHitos || hitosIds.has(item.id));
  }), [query, stateFilter, entityFilter, onlyHitos, hitosIds]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await context.registerTool({
        name: 'navigate_gaip_demo', title: 'Navegar por GAIP Intelligence',
        description: 'Abre una vista existente del demo: modelo de datos, panorama, licitaciones u ofertas.',
        inputSchema: { type:'object', properties:{ view:{ type:'string', enum:['panorama','licitaciones','ofertas'] } }, required:['view'], additionalProperties:false },
        annotations: { readOnlyHint:false, untrustedContentHint:false },
        execute(input: unknown) {
          const value = (input as { view?: string })?.view;
          if (!['panorama','licitaciones','ofertas'].includes(value ?? '')) throw new Error('Vista no válida');
          navigate(value as View);
          return { visibleView:value };
        },
      }, { signal:lifecycle.signal });
      await context.registerTool({
        name: 'filter_licitaciones', title: 'Filtrar licitaciones',
        description: 'Abre licitaciones y aplica un filtro por estado y una búsqueda opcional.',
        inputSchema: { type:'object', properties:{ state:{ type:'string', enum:['Todos','Detectada','Filtrada','En trabajo','Construcción','Fallo'] }, query:{ type:'string' } }, required:['state'], additionalProperties:false },
        annotations: { readOnlyHint:false, untrustedContentHint:false },
        execute(input: unknown) {
          const value = input as { state?: string; query?: string };
          if (!['Todos','Detectada','Filtrada','En trabajo','Construcción','Fallo'].includes(value.state ?? '')) throw new Error('Estado no válido');
          setStateFilter(value.state as 'Todos' | Estado); setQuery(value.query ?? ''); navigate('licitaciones');
          return { visibleView:'licitaciones', state:value.state, query:value.query ?? '' };
        },
      }, { signal:lifecycle.signal });
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [navigate]);

  useEffect(() => {
    const openCommandSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setChatOpen(true);
      }
    };
    window.addEventListener('keydown', openCommandSearch);
    return () => window.removeEventListener('keydown', openCommandSearch);
  }, []);

  return (
    <main className="app-shell">
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      {modulosGris && <GraySourceDialog label={modulosGris.label} hoy={modulosGris.hoy} con={modulosGris.con} onClose={() => setModuloAbierto(null)} />}
      <aside className="sidebar">
        <div className="brand-lockup">
          <Image src="/gaip-logo.png" alt="GAIP — Gerenciación, Administración e Ingeniería de Proyectos" width={184} height={75} unoptimized priority />
          <span className="brand-product">Intelligence</span>
        </div>
        <nav aria-label="Navegación principal">
          <p className="nav-section-heading">Operación</p>
          <div className="nav-items">
            <Button variant="ghost" aria-label="Resumen ejecutivo" aria-current={view === 'panorama' ? 'page' : undefined} className={`nav-item ${view === 'panorama' ? 'active' : ''}`} onClick={() => navigate('panorama')}>
              <Gauge className="nav-icon" /><span className="nav-copy">Resumen</span>
            </Button>
            <Button variant="ghost" aria-label={`Licitaciones, ${fuentes.totalProcesosUnicos} procesos únicos`} aria-current={view === 'licitaciones' || view === 'detalle' ? 'page' : undefined} className={`nav-item ${view === 'licitaciones' || view === 'detalle' ? 'active' : ''}`} onClick={() => navigate('licitaciones')}>
              <FileStack className="nav-icon" /><span className="nav-copy">Licitaciones</span><span className="nav-count">{fuentes.totalProcesosUnicos}</span>
            </Button>
            <Button variant="ghost" aria-label={`Ofertas, ${oferta ? 1 : 0} en seguimiento`} aria-current={view === 'ofertas' ? 'page' : undefined} className={`nav-item ${view === 'ofertas' ? 'active' : ''}`} onClick={() => navigate('ofertas')}>
              <BriefcaseBusiness className="nav-icon" /><span className="nav-copy">Ofertas</span><span className="nav-count">{oferta ? 1 : 0}</span>
            </Button>
            <Button variant="ghost" aria-label="Finanzas, vista de concepto" aria-current={view === 'finanzas' ? 'page' : undefined} className={`nav-item ${view === 'finanzas' ? 'active' : ''}`} onClick={() => navigate('finanzas')}>
              <Wallet className="nav-icon" /><span className="nav-copy">Finanzas</span><FlaskConical className="nav-icon-concept" aria-hidden="true" />
            </Button>
            <Button variant="ghost" aria-label="Obra, vista de concepto" aria-current={view === 'obra' ? 'page' : undefined} className={`nav-item ${view === 'obra' ? 'active' : ''}`} onClick={() => navigate('obra')}>
              <HardHat className="nav-icon" /><span className="nav-copy">Obra</span><FlaskConical className="nav-icon-concept" aria-hidden="true" />
            </Button>
            <Button variant="ghost" aria-label="Cruce de datos, motor en vivo" aria-current={view === 'matching' ? 'page' : undefined} className={`nav-item ${view === 'matching' ? 'active' : ''}`} onClick={() => navigate('matching')}>
              <GitMerge className="nav-icon" /><span className="nav-copy">Cruce</span><FlaskConical className="nav-icon-concept" aria-hidden="true" />
            </Button>
          </div>
        </nav>
        <ModuleBar activo={moduloActivo} onModuleClick={(key) => { if (key === 'finanzas' || key === 'obra') navigate(key); else if (key === 'licitaciones') navigate('panorama'); else setModuloAbierto(key); }} />
        <div className="sidebar-footer">
          <div className="profile-card">
            <span className="avatar">US</span>
            <span className="profile-copy"><strong>Usuario</strong><small>Dirección</small></span>
          </div>
        </div>
      </aside>

      <section className="workspace" id="main-content" tabIndex={-1}>
        <header className="topbar">
          <div>
            <h1>{view === 'panorama' ? 'Panorama operativo' : view === 'licitaciones' ? 'Licitaciones unificadas' : view === 'ofertas' ? 'Ofertas' : view === 'finanzas' ? 'Finanzas' : view === 'obra' ? 'Obra' : view === 'matching' ? 'Cruce de datos' : 'Detalle del expediente'}</h1>
          </div>
          <div className="top-actions">
            <button className="command-search" onClick={() => setChatOpen(true)} aria-label="Abrir consultas operativas">
              <Search /><span>Buscar o consultar la operación</span><kbd>⌘ K</kbd>
            </button>
            <div className="data-status">
              <span className="data-mark"><CalendarDays /></span>
              <div className="data-status-copy"><strong>Corte de datos</strong><time>{fuentes.corte}</time></div>
            </div>
          </div>
        </header>

        <div className="content">
          {view === 'panorama' && <Dashboard onAll={() => navigate('licitaciones')} onHitos={openHitos} onDetail={openDetail} onNavigateView={navigate} />}
          {view === 'licitaciones' && <LicitacionesView
                query={query}
                setQuery={(value) => { setQuery(value); setTenderPage(0); }}
                stateFilter={stateFilter}
                setStateFilter={(value) => { setStateFilter(value); setTenderPage(0); }}
                entityFilter={entityFilter}
                setEntityFilter={(value) => { setEntityFilter(value); setTenderPage(0); }}
                page={tenderPage}
                setPage={setTenderPage}
                filtered={filtered}
                onDetail={openDetail}
                onlyHitos={onlyHitos}
                clearOnlyHitos={() => { setOnlyHitos(false); setTenderPage(0); }}
              />}
          {view === 'ofertas' && <OfertasView />}
          {view === 'finanzas' && <FinanzasView />}
          {view === 'obra' && <ObraView />}
          {view === 'matching' && <MatchingEngineView />}
          {view === 'detalle' && selected && <DetailView item={selected} onBack={() => navigate('licitaciones')} onGoToMatch={() => navigate('matching')} />}
        </div>
      </section>

      {!chatOpen && <button className="assistant-fab" onClick={() => setChatOpen(true)} aria-label="Abrir consultas operativas"><MessageCircle /><span>Consultas operativas</span></button>}
      <IntelligencePanel open={chatOpen} onOpenChange={setChatOpen} onDetail={openDetail} />
    </main>
  );
}

type Licitation = Licitacion;

// --- Pieza 5: barra de módulos de empresa. Encuadra Licitaciones como UN módulo, no el producto.
// Finanzas/Obra son un tercer estado visual: "vista de concepto" (FlaskConical), ni el real
// verificado de Licitaciones ni el gris bloqueado de RH — ver docs/ejemplo-ilustrativo-cruce.md. ---
function ModuleBar({ activo, onModuleClick }: { activo: ModuloKey; onModuleClick: (key: ModuloKey) => void }) {
  const modulos: ModuloKey[] = ['licitaciones', 'rh', 'finanzas', 'obra'];
  return <nav className="module-bar" aria-label="Módulos de la empresa">
    <span className="module-bar-label">GAIP ·</span>
    <div className="module-bar-list">
      {modulos.map((key) => {
        const info = moduloInfo[key];
        const estado = MODULO_ESTADO[key];
        const conectado = estado !== 'no_conectado';
        const ilustrativo = estado === 'ilustrativo';
        const isActive = key === activo;
        return <button
          key={key}
          className={`module-pill ${conectado ? 'on' : 'off'} ${isActive ? 'active' : ''}`}
          aria-current={isActive ? 'page' : undefined}
          aria-haspopup={conectado ? undefined : 'dialog'}
          title={ilustrativo ? 'Vista de concepto: datos ilustrativos, no reales' : conectado ? undefined : 'Vista de demostración: módulo no conectado'}
          onClick={() => onModuleClick(key)}
        ><info.icon />{info.label}{!conectado && <Lock className="module-pill-lock" />}{ilustrativo && <FlaskConical className="module-pill-concept" aria-hidden="true" />}</button>;
      })}
    </div>
  </nav>;
}

// Diálogo "no conectado — qué se desbloquea": lo comparten el mapa de fuentes (Pieza 4)
// y la barra de módulos de empresa (Pieza 5). Misma regla: nunca una cifra simulada.
function GraySourceDialog({ label, hoy, con, onClose }: { label: string; hoy: string; con: string; onClose: () => void }) {
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="gray-source-panel">
      <DialogHeader className="gray-source-panel-head">
        <Lock aria-hidden="true" />
        <DialogTitle>{label}: no conectado</DialogTitle>
      </DialogHeader>
      <p className="gray-source-today">{hoy}</p>
      <DialogDescription className="gray-source-would">{con}</DialogDescription>
    </DialogContent>
  </Dialog>;
}

function Dashboard({ onAll, onHitos, onDetail, onNavigateView }: { onAll: () => void; onHitos: () => void; onDetail: (item: Licitacion) => void; onNavigateView: (view: View) => void }) {
  const expedientesConTareas = licitaciones.filter((item) => item.tareas?.length).length;
  const metrics = [
    { label:'Invitaciones sin procesar', value: fuentes.totalInvitacionesSinProcesar.toLocaleString('es-MX'), detail:'Esperando filtro de GAIP, aún no entran al pipeline', icon:FileStack },
    { label:'Expedientes históricos', value: historicoResumen.totalExpedientes.toLocaleString('es-MX'), detail:`${historicoResumen.totalSnapshots} cortes consolidados`, icon:Database },
    { label:'Expedientes con tareas', value:String(expedientesConTareas), detail:'Con avances registrados en la fuente', icon:Gauge },
    { label:'Oferta en seguimiento', value: oferta.monto, detail:`${oferta.empresa} · ${oferta.proyecto}`, icon:TrendingUp },
  ];
  return <div className="executive-dashboard">
    <div className="page-heading"><div><h2>Resumen ejecutivo</h2><p>Corte operativo al {fuentes.corte}.</p></div><Button variant="outline" onClick={onAll}>Abrir directorio <ChevronRight /></Button></div>

    <FuentesConectadasResumen onNavigateView={onNavigateView} />
    <RiesgoPortafolioResumen onNavigateView={onNavigateView} />

    <section className="consolidation-story" aria-label="Estado del corte operativo">
      <div className="story-intro"><span>ESTADO DEL CORTE</span><strong><b>{fuentes.totalProcesosUnicos}</b> procesos únicos</strong><small>Consolidados desde {fuentes.totalListasOrigen} listas de origen</small></div>
      <div className="story-step"><div><span>Registros recibidos</span><strong>{fuentes.totalRegistrosRecibidos}</strong><small>en el corte actual</small></div></div>
      <div className="story-step"><div><span>Duplicados detectados</span><strong>{fuentes.totalDuplicados}</strong><small>conciliados automáticamente</small></div></div>
      <div className="story-step featured"><div><span>Cobertura</span><strong>{Math.round((fuentes.totalProcesosUnicos / fuentes.totalRegistrosRecibidos) * 100)}%</strong><small>de registros únicos</small></div></div>
      {hitos.length > 0 && <button onClick={onHitos}><span className="story-alert-icon"><AlertTriangle /></span><div><small>REQUIERE ATENCIÓN</small><strong>{hitos.length} hitos próximos</strong><span>Ver los {hitos.length} expedientes con fallo próximo</span></div><ChevronRight /></button>}
    </section>

    <section className="metric-grid">
      {metrics.map((metric) => <Card className="executive-metric" key={metric.label}><CardHeader><div className="metric-glyph"><metric.icon /></div><span>{metric.label}</span></CardHeader><CardContent><strong>{metric.value}</strong><p>{metric.detail}</p></CardContent></Card>)}
    </section>

    <AiExecutiveInsights onDetail={onDetail} />

    <section className="dashboard-card-columns">
      <div className="dashboard-card-column">
        <Card className="executive-card pipeline-card"><CardHeader><div><CardTitle>Portafolio por etapa</CardTitle><p>Conteo de registros en listas de origen por etapa</p></div><Button variant="ghost" size="sm" onClick={onAll}>Abrir listado</Button></CardHeader><CardContent><div className="pipeline-chart">{stages.map((stage) => <div className="pipeline-row" key={stage.label}><div><span>{stage.label}</span><strong>{stage.value}</strong></div><div className="pipeline-bar"><i style={{ width:`${Math.max(12, stage.value * 2.25)}%`, background:stage.color }} /></div></div>)}</div><div className="portfolio-note"><Database /><span>Los conteos pueden incluir procesos presentes en más de una lista.</span></div></CardContent></Card>
        <Card className="executive-card entity-card"><CardHeader><div><CardTitle>Procesos por entidad</CardTitle><p>Muestra operativa disponible</p></div><MapPin /></CardHeader><CardContent><div className="bar-chart">{entityBars.map((bar) => <div className="bar-row" key={bar.name}><span>{bar.name}</span><div><i style={{ width:`${(bar.value / entityBars[0].value) * 100}%` }} /></div><strong>{bar.value}</strong></div>)}</div></CardContent></Card>
        <HistoricoAnalisis />
      </div>
      <div className="dashboard-card-column">
        <Card className="executive-card milestones-card"><CardHeader><div><CardTitle>Próximos fallos</CardTitle><p>Fecha en que la dependencia resuelve el ganador · corte {fuentes.corte}</p></div><CalendarDays /></CardHeader><CardContent><div className="deadline-list">{hitos.map((hito) => { const item = licitacionPorId(hito.id); const [dia, mes] = hito.fecha.split(' '); return <button className="deadline" key={item.id} onClick={() => onDetail(item)}><div className="date risk"><strong>{dia}</strong><span>{mes.toUpperCase()}</span></div><div><strong>{item.dependencia}</strong><span>{item.nombre}</span></div><ChevronRight /></button>; })}</div></CardContent></Card>
        <Card className="executive-card workload-card"><CardHeader><div><CardTitle>Avance por responsable</CardTitle><p>Promedio de tareas asignadas · fuente: Excel de Gantt</p></div><Users /></CardHeader><CardContent><div className="workload-list">{carga.map((person) => <div className="workload" key={person.nombre}><div><strong>{person.nombre}</strong><span>{person.asignaciones} tareas</span></div><b>{person.avance}%</b><Progress value={person.avance} /></div>)}</div></CardContent></Card>
      </div>
    </section>

    <CapacidadVsDemanda onDetail={onDetail} />
  </div>;
}

// Abre el resumen ejecutivo dejando claro, en un vistazo, que este no es un dashboard de
// una sola fuente: cuenta lo que trae cada una de las 4 y qué tan viva está (2 reales, 1
// de concepto sobre el motor de cruce). Es el mismo argumento del mapa de fuentes original
// del Plan v2, pero como encabezado permanente en vez de pantalla aparte.
function FuentesConectadasResumen({ onNavigateView }: { onNavigateView: (view: View) => void }) {
  const fuentesResumen: { label: string; detalle: string; icon: typeof Database; view: View; badge?: string }[] = [
    { label: 'ComprasMX', detalle: `${fuentes.totalProcesosUnicos} procesos únicos`, icon: FileStack, view: 'licitaciones' },
    { label: 'Excel de Gantt', detalle: `${carga.reduce((s, c) => s + c.asignaciones, 0)} tareas · ${carga.length} responsables`, icon: Users, view: 'licitaciones' },
    { label: 'Excel de Ofertas', detalle: `${oferta.monto} en seguimiento`, icon: TrendingUp, view: 'ofertas' },
    { label: 'Tablero de Proyectos', detalle: `${proyectos.length} proyectos adjudicados`, icon: Building2, view: 'matching', badge: 'concepto' },
  ];
  return <section className="fuentes-resumen" aria-label="Fuentes conectadas al corte">
    <span className="fuentes-resumen-label"><GitMerge />{fuentesResumen.length} fuentes cruzándose en este corte</span>
    <div className="fuentes-resumen-list">
      {fuentesResumen.map((f) => <button key={f.label} className="fuentes-resumen-item" onClick={() => onNavigateView(f.view)}>
        <f.icon />
        <div><strong>{f.label}{f.badge && <span className="concept-badge-inline">{f.badge}</span>}</strong><span>{f.detalle}</span></div>
      </button>)}
    </div>
  </section>;
}

const riesgoNivelLabel: Record<RiesgoNivel, string> = { alto: 'Riesgo alto', medio: 'Riesgo medio', bajo: 'Riesgo bajo' };

// El insight insignia del cruce (docs/ejemplo-ilustrativo-cruce.md §3.6), promovido del
// módulo Cruce al resumen ejecutivo: la pregunta "¿qué proyecto necesita atención esta
// semana?" combinando desfase avance/facturación + margen de fianza + carga de equipo.
function RiesgoPortafolioResumen({ onNavigateView }: { onNavigateView: (view: View) => void }) {
  const ranking = riesgoPortafolio();
  const top = ranking.slice(0, 3);
  return <section className="riesgo-portafolio" aria-label="Riesgo de portafolio, cruzando licitaciones y proyectos adjudicados">
    <Card className="executive-card">
      <CardHeader>
        <div><CardTitle>¿Qué proyecto adjudicado necesita atención esta semana?</CardTitle><p>Cruce: avance vs. facturación (Finanzas) + fianzas vs. fallo (ComprasMX) + carga de equipo (Excel de Gantt)</p></div>
        <span className="concept-badge"><FlaskConical />Datos ilustrativos</span>
      </CardHeader>
      <CardContent>
        <div className="riesgo-portafolio-list">
          {top.map(({ proyecto, nivel, razones }) => {
            const match = matchResultPorProyecto(proyecto.id);
            const licitacion = match?.licitacionId ? licitacionPorId(match.licitacionId) : undefined;
            return <button key={proyecto.id} className="riesgo-portafolio-row" onClick={() => onNavigateView('matching')}>
              <span className={`riesgo-pill riesgo-${nivel}`}>{riesgoNivelLabel[nivel]}</span>
              <div className="riesgo-portafolio-copy">
                <strong>{proyecto.name}</strong>
                <span>{razones.length > 0 ? razones.join(' · ') : 'Sin señales de riesgo en este corte.'}</span>
                {licitacion && <small>Origen: {licitacion.numero} — {licitacion.dependencia}</small>}
              </div>
              <ChevronRight className="riesgo-portafolio-arrow" />
            </button>;
          })}
        </div>
        <button className="riesgo-portafolio-footer" onClick={() => onNavigateView('matching')}>
          Ver el cruce completo de {proyectos.length} proyectos <ArrowRight />
        </button>
      </CardContent>
    </Card>
  </section>;
}

// Lectura editorial prototipo: el contenido está hardcodeado a partir del corte real.
// Cuando exista el servicio de IA, esta superficie puede conservarse y sustituir solo la narrativa.
function AiExecutiveInsights({ onDetail }: { onDetail: (item: Licitacion) => void }) {
  const alerta = licitacionPorId('XLS-SIOPESMA0BLP05692026');
  return <section className="ai-insights" aria-labelledby="ai-insights-title">
    <div className="ai-briefing">
      <div className="ai-briefing-heading">
        <div className="briefing-meta"><span>Nota de licitaciones</span><time>{fuentes.corte}</time></div>
        <h3 id="ai-insights-title">Puerto Vallarta vence el 17 de septiembre.</h3>
      </div>
      <p>El expediente registra <strong>ocho tareas sin iniciar</strong>. Confirma responsables y vigencia del calendario antes de reasignar trabajo.</p>
      <div className="ai-briefing-footer"><span><Database /> ComprasMX · corte {fuentes.corte}</span><button onClick={() => onDetail(alerta)}>Abrir expediente <ChevronRight /></button></div>
    </div>
    <div className="insight-stack" aria-label="Datos clave del corte">
      <h4 className="insight-stack-heading">Datos para revisar</h4>
      <div className="insight-ledger">
        <article className="insight-record critical"><span>Avance</span><div><strong>8 tareas sin iniciar</strong><p>Puerto Vallarta · fallo 17 sep · confirma responsables.</p></div></article>
        <article className="insight-record"><span>Concentración</span><div><strong>33 procesos · CDMX y Jalisco</strong><p>52% de los 64 procesos únicos del corte.</p></div></article>
        <article className="insight-record"><span>Etapa principal</span><div><strong>40 registros · Construcción</strong><p>49% de los registros de origen; algunos pueden aparecer en más de una lista.</p></div></article>
        <article className="insight-record"><span>Carga por revisar</span><div><strong>44 tareas con avance menor a 45%</strong><p>Alicia, Jemo y Javier/Brenda concentran esa carga.</p></div></article>
      </div>
    </div>
  </section>;
}

// --- Pieza 6: embudo del corte actual (recibidos → únicos → en trabajo). El histórico de 60 cortes
// se muestra aparte, solo como referencia de escala: no es la misma unidad de medida que el corte de hoy,
// así que nunca se dividen entre sí (eso daba un falso "0.28% de conversión").
function HistoricoAnalisis() {
  const enTrabajo = stages.find((s) => s.label === 'En trabajo')?.value ?? 0;
  const conversionPct = ((enTrabajo / fuentes.totalProcesosUnicos) * 100).toFixed(1);
  return <section className="historico-analisis" aria-label="Análisis del corte">
    <Card className="executive-card">
      <CardHeader><div><CardTitle>Embudo del corte</CardTitle><p>De registro recibido a trabajo activo, en el corte de hoy</p></div><span className="history-source"><Database />{fuentes.corte}</span></CardHeader>
      <CardContent>
        <div className="history-layout">
          <div className="history-result"><span>EN TRABAJO ACTIVO</span><strong>{conversionPct}%</strong><small>de los procesos únicos del corte</small></div>
          <div className="funnel-row">
            <div className="funnel-step"><strong>{fuentes.totalRegistrosRecibidos}</strong><span>registros recibidos</span></div>
            <ChevronRight className="funnel-sep" />
            <div className="funnel-step"><strong>{fuentes.totalProcesosUnicos}</strong><span>procesos únicos</span></div>
            <ChevronRight className="funnel-sep" />
            <div className="funnel-step featured"><strong>{enTrabajo}</strong><span>en trabajo activo</span></div>
          </div>
        </div>
        <p className="portfolio-note-inline"><Database />{enTrabajo} en trabajo ÷ {fuentes.totalProcesosUnicos} procesos únicos · fuente: corte actual. Cálculo determinístico.</p>
        <p className="portfolio-note-inline history-scale-note"><Database />Para referencia de escala: {historicoResumen.totalExpedientes.toLocaleString('es-MX')} expedientes acumulados en los últimos {historicoResumen.totalSnapshots} cortes.</p>
      </CardContent>
    </Card>
  </section>;
}

// --- Pieza 3: Capacidad vs. Demanda con acción y aprobación. ---
function CapacidadVsDemanda({ onDetail }: { onDetail: (item: Licitacion) => void }) {
  const { sobrecargada, destino, tareaAMover } = capacidadCaso;
  return <section className="capacidad-demanda" aria-label="Capacidad versus demanda">
    <Card className="executive-card capacidad-card">
      <CardHeader><div><CardTitle>Capacidad vs. Demanda</CardTitle><p>Cruce: tareas abiertas en Gantt × fecha de fallo por expediente. Fuentes: Excel de Gantt + ComprasMX</p></div><AlertTriangle className="capacidad-alert-icon" /></CardHeader>
      <CardContent>
        <div className="capacidad-evidencia">
          <div className="capacidad-persona overloaded">
            <span className="capacidad-persona-label">SOBRECARGADA</span>
            <strong>{sobrecargada.nombre}</strong>
            <span className="capacidad-persona-stat">{sobrecargada.carga.asignaciones} tareas asignadas en total · {sobrecargada.expedientes.length} expedientes con fallo próximo</span>
            <div className="capacidad-expedientes">
              {sobrecargada.expedientes.map(({ item, tareas }) => <button className="capacidad-expediente" key={item.id} onClick={() => onDetail(item)}>
                <span className="capacidad-expediente-dep">{item.dependencia}</span>
                <strong>{item.nombre}</strong>
                <span className="capacidad-expediente-detalle">{tareas.length} tarea{tareas.length === 1 ? '' : 's'} abierta{tareas.length === 1 ? '' : 's'} · fallo {item.fallo ?? 'sin fecha'}</span>
              </button>)}
            </div>
          </div>
          <div className="capacidad-arrow" aria-hidden="true"><ArrowRight /></div>
          <div className="capacidad-persona available">
            <span className="capacidad-persona-label">CON CAPACIDAD</span>
            <strong>{destino.nombre}</strong>
            <span className="capacidad-persona-stat">{destino.carga.asignaciones} tareas asignadas en total · sin fecha de fallo próxima</span>
            <div className="capacidad-expedientes">
              <button className="capacidad-expediente" onClick={() => onDetail(destino.expediente.item)}>
                <span className="capacidad-expediente-dep">{destino.expediente.item.dependencia}</span>
                <strong>{destino.expediente.item.nombre}</strong>
                <span className="capacidad-expediente-detalle">{destino.expediente.tareas.length} tarea{destino.expediente.tareas.length === 1 ? '' : 's'} abierta{destino.expediente.tareas.length === 1 ? '' : 's'} · {luisAbiertas82kmAvance}% avance promedio · sin fecha de fallo</span>
              </button>
            </div>
          </div>
        </div>
        <div className="capacidad-propuesta">
          <div className="capacidad-propuesta-copy">
            <p className="section-kicker">PROPUESTA DE REASIGNACIÓN</p>
            <strong className="capacidad-propuesta-title">Reasignar una tarea económica de {sobrecargada.nombre} a {destino.nombre}</strong>
            <p>Mover <strong>&quot;{tareaAMover.nombre}&quot;</strong> del expediente <strong>{tramoIIICapacidad.numero}</strong>, con fallo el {tramoIIICapacidad.fallo}. {destino.nombre} registra {luisAbiertas82kmAvance}% de avance promedio en sus {luisAbiertas82km.length} tareas abiertas del expediente 82km, sin fecha de fallo registrada.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </section>;
}

// Insights del directorio completo — fijos sobre el corte, no cambian con los filtros de la tabla.
// Derivados de licitaciones/hitos/carga reales, nada hardcodeado por caso.
const directorioInsights = (() => {
  const entidadTop = [...porEntidad].sort((a, b) => b.value - a.value)[0];
  const pctEntidadTop = Math.round((entidadTop.value / fuentes.totalProcesosUnicos) * 100);

  const conFallo = licitaciones.filter((item) => item.estado === 'Fallo').length;
  const enConstruccion = licitaciones.filter((item) => item.estado === 'Construcción').length;

  const hitoMasProximo = hitos[0];
  const expedienteHito = hitoMasProximo ? licitacionPorId(hitoMasProximo.id) : undefined;

  const cargaTop = [...carga].sort((a, b) => b.asignaciones - a.asignaciones)[0];

  return [
    { label: 'Concentración', title: `${entidadTop.value} procesos en ${entidadTop.name}`, detail: `${pctEntidadTop}% de los ${fuentes.totalProcesosUnicos} procesos únicos del corte.` },
    { label: 'Etapa principal', title: `${enConstruccion} expedientes en construcción`, detail: conFallo > 0 ? `${conFallo} más ya están en fallo (ganador resuelto).` : 'La etapa con más volumen del portafolio.' },
    ...(expedienteHito ? [{ label: 'Fallo más próximo', title: `${expedienteHito.dependencia} · ${hitoMasProximo!.fecha}`, detail: expedienteHito.nombre, critical: true }] : []),
    { label: 'Mayor carga de equipo', title: `${cargaTop.nombre} con ${cargaTop.asignaciones} tareas`, detail: `${cargaTop.avance}% de avance promedio en lo asignado.` },
  ];
})();

function LicitacionesView(props: { query:string; setQuery:(v:string)=>void; stateFilter:'Todos'|Estado; setStateFilter:(v:'Todos'|Estado)=>void; entityFilter:string; setEntityFilter:(v:string)=>void; page:number; setPage:(v:number)=>void; filtered:Licitacion[]; onDetail:(v:Licitacion)=>void; onlyHitos:boolean; clearOnlyHitos:()=>void }) {
  const entities = ['Todas', ...Array.from(new Set(licitaciones.map((item) => item.entidad)))];
  const pageSize = 25;
  const pageCount = Math.ceil(props.filtered.length / pageSize);
  const currentPage = Math.min(props.page, Math.max(pageCount - 1, 0));
  const firstVisible = currentPage * pageSize;
  const visible = props.filtered.slice(firstVisible, firstVisible + pageSize);
  const lastVisible = Math.min(firstVisible + pageSize, props.filtered.length);
  const activeProcesses = licitaciones.filter((item) => item.estado === 'En trabajo' || item.estado === 'Construcción').length;
  const datedDecisions = hitos.length;
  const hasFilters = props.query.length > 0 || props.stateFilter !== 'Todos' || props.entityFilter !== 'Todas' || props.onlyHitos;
  const clearFilters = () => { props.setQuery(''); props.setStateFilter('Todos'); props.setEntityFilter('Todas'); props.clearOnlyHitos(); };
  return <section className="list-view">
    <div className="directory-heading"><div><p className="section-kicker">CONTROL DE LICITACIONES</p><h2>Directorio de procesos</h2><p>Encuentra un expediente y revisa su situación operativa en un solo lugar.</p></div><section className="directory-stats" aria-label="Resumen del directorio"><div><span>Procesos del corte</span><strong>{fuentes.totalProcesosUnicos}</strong></div><div><span>En ejecución</span><strong>{activeProcesses}</strong></div><div className="risk"><span>Fallos con fecha</span><strong>{datedDecisions}</strong></div></section></div>

    <section className="insight-stack directory-insights" aria-label="Datos clave del portafolio">
      <h4 className="insight-stack-heading">Datos para revisar</h4>
      <div className="insight-ledger">
        {directorioInsights.map((insight) => <article className={`insight-record ${insight.critical ? 'critical' : ''}`} key={insight.label}><span>{insight.label}</span><div><strong>{insight.title}</strong><p>{insight.detail}</p></div></article>)}
      </div>
    </section>

    {props.onlyHitos && <div className="active-hitos-filter"><AlertTriangle /><span>Mostrando solo los {datedDecisions} expedientes con fallo próximo</span><button onClick={props.clearOnlyHitos}>Quitar filtro</button></div>}
    <div className="directory-toolbar">
      <div className="search-field"><Search /><Input aria-label="Buscar licitaciones" value={props.query} onChange={(event) => props.setQuery(event.target.value)} placeholder="Buscar por proceso, dependencia o entidad…" />{props.query && <button className="clear-search" aria-label="Borrar búsqueda" onClick={() => props.setQuery('')}><X /></button>}</div>
      <section className="filter-group" aria-label="Filtros del directorio"><span className="filter-label"><Filter />Filtrar</span><div className="select-field"><Select value={props.stateFilter} onValueChange={(value) => props.setStateFilter(value as 'Todos'|Estado)}><SelectTrigger aria-label="Filtrar por estado"><SelectValue /></SelectTrigger><SelectContent>{['Todos','Detectada','Filtrada','En trabajo','Construcción','Fallo'].map((option) => <SelectItem value={option} key={option}>{option}</SelectItem>)}</SelectContent></Select></div>
      <Select value={props.entityFilter} onValueChange={(value) => props.setEntityFilter(value as string)}><SelectTrigger className="entity-select" aria-label="Filtrar por entidad"><SelectValue /></SelectTrigger><SelectContent>{entities.map((entity) => <SelectItem value={entity} key={entity}>{entity}</SelectItem>)}</SelectContent></Select>{hasFilters && <button className="clear-filters" onClick={clearFilters}>Limpiar filtros</button>}</section>
    </div>
    <div className="table-card">
      <div className="table-summary"><div aria-live="polite" aria-atomic="true"><strong>{props.filtered.length}</strong><span>procesos encontrados</span></div><small>Abre un expediente desde su nombre o el botón de la última columna</small></div>
      <div className="table-scroll"><table><thead><tr><th scope="col">Proceso</th><th scope="col">Dependencia / entidad</th><th scope="col">Estado</th><th scope="col">Próximo hito</th><th scope="col" aria-label="Acciones" /></tr></thead><tbody>{visible.map((item) => {
        const fechaFallo = fallosFechadosPorId.get(item.id);
        return <tr className={fechaFallo ? 'dated-fall-row' : undefined} key={item.id}>
          <td><button className="process-open" aria-label={`Abrir ${item.nombre}, expediente ${item.numero}`} onClick={() => props.onDetail(item)}><strong>{item.nombre}</strong><span>{item.numero}</span></button></td>
          <td><strong>{item.dependencia}</strong><span><MapPin />{item.entidad}</span></td>
          <td><StateBadge state={item.estado} /></td>
          <td><strong>{item.estado === 'Fallo' ? item.fallo : item.apertura}</strong><span>{item.estado === 'Fallo' ? 'Fallo' : 'Presentación'}</span>{fechaFallo && <span className="table-fall-reference"><AlertTriangle aria-hidden="true" />{item.estado === 'Fallo' ? 'Fecha de fallo registrada' : `Fallo · ${fechaFallo}`}</span>}</td>
          <td><button aria-label={`Abrir expediente ${item.numero}`} onClick={() => props.onDetail(item)}><ChevronRight /></button></td>
        </tr>;
      })}</tbody></table></div>
      {props.filtered.length === 0 && <div className="empty-state"><Search /><strong>Sin coincidencias</strong><span>Ajusta la búsqueda o los filtros.</span></div>}
      {props.filtered.length > 0 && <div className="table-pagination">
        <span className="table-range" aria-live="polite">Mostrando {firstVisible + 1}–{lastVisible} de {props.filtered.length} resultados</span>
        {pageCount > 1 && <div className="table-page-controls">
          <Button variant="outline" size="sm" aria-label="Página anterior" disabled={currentPage === 0} onClick={() => props.setPage(Math.max(currentPage - 1, 0))}><ChevronLeft />Anterior</Button>
          <span aria-live="polite">Página {currentPage + 1} de {pageCount}</span>
          <Button variant="outline" size="sm" aria-label="Página siguiente" disabled={currentPage >= pageCount - 1} onClick={() => props.setPage(Math.min(currentPage + 1, pageCount - 1))}>Siguiente<ChevronRight /></Button>
        </div>}
      </div>}
    </div>
  </section>;
}

function OfertasView() {
  const camposFecha = [
    { key: 'fechaCierre', label: 'Fecha de cierre' },
    { key: 'fechaLimite', label: 'Fecha límite' },
    { key: 'fechaSeguimiento', label: 'Próximo seguimiento' },
  ] as const;
  const fechas = ofertas.flatMap((item) => camposFecha.map(({ key, label }) => ({
    key: `${item.id}-${key}`,
    proyecto: item.proyecto,
    label,
    value: item[key],
  })));
  const fechasPendientes = fechas.filter(({ value }) => !value);
  const ofertasActivas = ofertas.filter((item) => item.estatus === 'En seguimiento').length;

  return <section className="offer-workspace" aria-labelledby="offers-heading">
    <div className="offer-workspace-heading">
      <div>
        <p className="section-kicker">CONTROL COMERCIAL</p>
        <h2 id="offers-heading">Seguimiento comercial</h2>
        <p>Revisa el estado de cada propuesta y detecta los datos que faltan.</p>
      </div>
    </div>

    <div className="offer-summary-strip" aria-label="Resumen de ofertas">
      <div className="offer-summary-metric">
        <span className="offer-summary-icon"><BriefcaseBusiness aria-hidden="true" /></span>
        <span className="offer-summary-copy"><span>En seguimiento</span><strong>{ofertasActivas}</strong></span>
      </div>
      <div className={`offer-summary-metric ${fechasPendientes.length ? 'needs-attention' : ''}`}>
        <span className="offer-summary-icon"><CalendarDays aria-hidden="true" /></span>
        <span className="offer-summary-copy"><span>Fechas sin registrar</span><strong>{fechasPendientes.length}</strong></span>
      </div>
    </div>

    <div className="offer-main-grid">
      <section className="offer-list-panel" aria-labelledby="offer-list-title">
        <div className="offer-panel-heading">
          <div><h3 id="offer-list-title">Ofertas registradas</h3><p>Consulta los datos principales de cada propuesta.</p></div>
          <span>{ofertas.length} {ofertas.length === 1 ? 'registro' : 'registros'}</span>
        </div>

        {ofertas.length > 0 ? <div className="offer-table-scroll">
          <table className="offer-table">
            <thead><tr><th scope="col">Proyecto</th><th scope="col">Empresa y servicio</th><th scope="col">Estado</th><th scope="col">Monto · moneda no indicada</th></tr></thead>
            <tbody>{ofertas.map((item) => <tr key={item.id}>
              <td data-label="Proyecto"><strong>{item.proyecto}</strong></td>
              <td data-label="Empresa y servicio"><strong>{item.empresa}</strong><span>{item.servicio}</span></td>
              <td data-label="Estado"><span className={`offer-list-state ${item.estatus === 'En seguimiento' ? 'is-active' : ''}`}><i aria-hidden="true" />{item.estatus}</span></td>
              <td data-label="Monto"><strong className="offer-list-amount">{item.monto}</strong></td>
            </tr>)}</tbody>
          </table>
        </div> : <div className="offer-list-empty"><BriefcaseBusiness aria-hidden="true" /><strong>No hay ofertas registradas</strong><span>Cuando exista una propuesta en la fuente comercial, aparecerá aquí.</span></div>}

        <div className="offer-list-footer">
          <span>Los montos se controlan fuera de los indicadores de licitaciones.</span>
        </div>
      </section>

      <aside className="offer-followup-panel" aria-labelledby="offer-followup-title">
        <div className="offer-followup-heading">
          <span className="offer-followup-icon"><AlertTriangle aria-hidden="true" /></span>
          <div><p className="section-kicker">PENDIENTE</p><h3 id="offer-followup-title">Fechas por completar</h3></div>
          <strong>{fechasPendientes.length}</strong>
        </div>
        {fechasPendientes.length > 0 ? <ul className="offer-followup-list">
          {fechasPendientes.map((fecha) => <li key={fecha.key}>
            <div>{ofertas.length > 1 && <small>{fecha.proyecto}</small>}<span>{fecha.label}</span></div>
            <strong>Sin registrar</strong>
          </li>)}
        </ul> : <p className="offer-followup-complete"><CheckCircle2 aria-hidden="true" />No hay fechas pendientes.</p>}
        {fechasPendientes.length > 0 && <p className="offer-followup-note">Estas fechas no aparecen en el registro de origen. La demostración es de consulta; actualízalas en la fuente comercial.</p>}
      </aside>
    </div>
  </section>;
}

function formatSourceDate(value: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}

// Insights derivados de las tareas reales del expediente — nada hardcodeado por caso,
// así que aplican igual de bien a cualquier expediente que tenga tareas de Gantt.
function expedienteInsights(tareas: Tarea[]) {
  if (!tareas.length) return [];
  const insights: { label: string; title: string; detail: string; critical?: boolean }[] = [];

  const sinIniciar = tareas.filter((t) => t.avance === 0);
  if (sinIniciar.length) {
    const porArea = new Map<string, number>();
    sinIniciar.forEach((t) => porArea.set(t.area, (porArea.get(t.area) ?? 0) + 1));
    const areasSinIniciar = [...porArea.entries()].sort((a, b) => b[1] - a[1]);
    const [areaTop, countTop] = areasSinIniciar[0];
    const empatadas = areasSinIniciar.filter(([, count]) => count === countTop).length > 1;
    const dondeTexto = empatadas
      ? `Repartidas entre ${areasSinIniciar.map(([area]) => area.toLowerCase()).join(' y ')}`
      : `Concentradas en el área ${areaTop.toLowerCase()}`;
    insights.push({
      label: 'Sin iniciar', critical: true,
      title: `${sinIniciar.length} tarea${sinIniciar.length === 1 ? '' : 's'} en 0%`,
      detail: `${dondeTexto}. Conviene confirmar responsable y fecha antes de que se acumulen.`,
    });
  }

  const areas = Array.from(new Set(tareas.map((t) => t.area)));
  if (areas.length > 1) {
    const promedios = areas.map((area) => {
      const deArea = tareas.filter((t) => t.area === area);
      return { area, avg: Math.round(deArea.reduce((s, t) => s + t.avance, 0) / deArea.length) };
    }).sort((a, b) => a.avg - b.avg);
    const rezagada = promedios[0];
    const adelantada = promedios[promedios.length - 1];
    if (adelantada.avg - rezagada.avg >= 15) {
      insights.push({
        label: 'Desbalance entre áreas',
        title: `${rezagada.area} va ${adelantada.avg - rezagada.avg} pts atrás de ${adelantada.area}`,
        detail: `${rezagada.area} promedia ${rezagada.avg}% frente a ${adelantada.avg}% en ${adelantada.area}.`,
      });
    }
  }

  const porResponsable = new Map<string, Tarea[]>();
  tareas.forEach((t) => porResponsable.set(t.responsable, [...(porResponsable.get(t.responsable) ?? []), t]));
  const [responsableTop, tareasTop] = [...porResponsable.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  if (porResponsable.size > 1) {
    const avgTop = Math.round(tareasTop.reduce((s, t) => s + t.avance, 0) / tareasTop.length);
    insights.push({
      label: 'Mayor carga',
      title: `${responsableTop} lleva ${tareasTop.length} de ${tareas.length} tareas`,
      detail: `${avgTop}% de avance promedio en lo que tiene asignado en este expediente.`,
    });
  }

  const enProgreso = tareas.filter((t) => t.avance > 0 && t.avance < 100).sort((a, b) => a.avance - b.avance)[0];
  if (enProgreso) {
    insights.push({
      label: 'Más cerca de cerrar',
      title: `"${enProgreso.nombre}" al ${enProgreso.avance}%`,
      detail: `A cargo de ${enProgreso.responsable}, área ${enProgreso.area.toLowerCase()}.`,
    });
  }

  return insights.slice(0, 4);
}

function DetailView({ item, onBack, onGoToMatch }: { item:Licitacion; onBack:()=>void; onGoToMatch:()=>void }) {
  const tareas = item.tareas ?? [];
  const average = tareas.length ? Math.round(tareas.reduce((sum,task) => sum + task.avance,0) / tareas.length) : 0;
  const completed = tareas.filter((task) => task.avance === 100).length;
  const owners = Array.from(new Set(tareas.map((task) => task.responsable)));
  const insights = expedienteInsights(tareas);
  const proyectoVinculado = matchResultPorLicitacion(item.id);
  const proyecto = proyectoVinculado ? proyectoPorId(proyectoVinculado.proyectoId) : undefined;
  const milestoneDates = [
    { label:'Aclaraciones', value:item.aclaraciones },
    { label:'Presentación', value:item.apertura },
    ...(item.fallo ? [{ label:'Fallo', value:item.fallo }] : []),
  ];
  return <section className="detail-view">
    <button className="back-button" onClick={onBack}><ChevronLeft /> Volver a licitaciones</button>
    <article className="detail-hero">
      <div className="detail-hero-main">
        <div className="detail-flags"><StateBadge state={item.estado} />{item.nueva && <span className="new-badge">Nueva</span>}<span className="detail-agency">{item.dependencia}</span></div>
        <h2>{item.nombre}</h2>
        <p className="detail-number">{item.numero}</p>
        <details className="source-name-disclosure"><summary>Consultar nombre original</summary><p>{item.nombreFuente}</p></details>
      </div>
      <div className="detail-progress-summary">
        <div className="score-ring score-ring-large" style={{ '--score':`${average * 3.6}deg` } as React.CSSProperties}><span>{average}%</span></div>
        <div><span>Avance del expediente</span><strong>{tareas.length ? `${completed} de ${tareas.length} tareas listas` : 'Sin tareas registradas'}</strong></div>
      </div>
    </article>

    {proyecto && <button type="button" className="detail-bridge" onClick={onGoToMatch}>
      <GitMerge />
      <div>
        <strong>Este expediente ya tiene proyecto activo: {proyecto.name}</strong>
        <span>Ver cobranza, avance de obra y fianzas cruzadas — vista de concepto en Cruce de datos</span>
      </div>
      <ArrowRight className="detail-bridge-arrow" />
    </button>}

    <div className="milestone-strip" aria-label="Fechas clave del proceso">
      {milestoneDates.map((date, index) => <div className="milestone" key={date.label} title={date.label === 'Fallo' ? 'Fallo: fecha en que la dependencia resuelve y da a conocer al ganador' : undefined}>
        <span className="milestone-index">{index + 1}</span><div><span>{date.label}</span><strong>{date.value}</strong></div>
      </div>)}
    </div>

    {insights.length > 0 && <section className="insight-stack detail-insights" aria-label="Datos clave del expediente">
      <h4 className="insight-stack-heading">Datos para revisar</h4>
      <div className="insight-ledger">
        {insights.map((insight) => <article className={`insight-record ${insight.critical ? 'critical' : ''}`} key={insight.label}><span>{insight.label}</span><div><strong>{insight.title}</strong><p>{insight.detail}</p></div></article>)}
      </div>
    </section>}

    <div className="detail-layout">
      <aside className="detail-side">
        <article className="detail-card process-card"><div className="detail-card-heading"><div><p className="section-kicker">DATOS DEL PROCESO</p><h3>Ficha del expediente</h3></div><Database /></div><dl><div><dt>Dependencia</dt><dd>{item.dependencia}</dd></div><div><dt>Entidad</dt><dd>{item.entidad}</dd></div><div><dt>Contratación</dt><dd>{item.tipo}</dd></div><div><dt>Estatus ComprasMX</dt><dd>{item.estatus}</dd></div></dl></article>
        {tareas.length > 0 && <article className="detail-card people-card"><p className="section-kicker">EQUIPO ASIGNADO</p><h3>{owners.length} responsable{owners.length === 1 ? '' : 's'}</h3><div className="owner-list">{owners.map((owner) => <div key={owner}><span className="owner-avatar">{owner.slice(0,2)}</span><div><strong>{owner}</strong><small>{tareas.filter((task) => task.responsable === owner).length} tareas asignadas</small></div></div>)}</div></article>}
      </aside>

      <article className="detail-card operations-panel">
        <div className="operations-heading">
          <div><p className="section-kicker">SEGUIMIENTO OPERATIVO</p><h3>Frentes de trabajo</h3><p>Avance y responsables por entregable.</p></div>
          {tareas.length > 0 && <div className="completion-chip"><CheckCircle2 /><span><strong>{completed}</strong> completadas</span></div>}
        </div>
        {(item.fechaAceptacion || item.fechaVisitaObra) && <div className="operation-dates">
          <div className="operation-date-list">
            {item.fechaAceptacion && <div className="operation-date"><CalendarDays /><span>Fecha de aceptación</span><strong>{formatSourceDate(item.fechaAceptacion)}</strong></div>}
            {item.fechaVisitaObra && <div className="operation-date"><CalendarDays /><span>Visita de obra</span><strong>{formatSourceDate(item.fechaVisitaObra)}</strong></div>}
          </div>
        </div>}
        {tareas.length > 0 ? <div className="task-groups">{(['Económica', 'Precio', 'Técnica'] as const).map((area) => {
          const areaTasks = tareas.filter((task) => task.area === area);
          if (!areaTasks.length) return null;
          const areaAverage = Math.round(areaTasks.reduce((sum, task) => sum + task.avance, 0) / areaTasks.length);
          return <section className="task-group" key={area} aria-label={`${area}, ${areaTasks.length} tareas`}>
            <div className="task-group-heading"><div><span className={`area area-${area.toLowerCase().replace('é','e')}`}>{area}</span><strong>{areaTasks.length} tarea{areaTasks.length === 1 ? '' : 's'}</strong></div><b>{areaAverage}%</b></div>
            <div className="task-list">{areaTasks.map((task) => <div className={`task ${task.avance === 100 ? 'task-complete' : ''}`} key={task.nombre}>
              <div className="task-status-icon">{task.avance === 100 ? <CheckCircle2 /> : <span />}</div>
              <div className="task-content"><div className="task-top task-top-grouped"><strong>{task.nombre}</strong><b>{task.avance}%</b></div>
              <Progress value={task.avance} />
              <div className="task-owner task-owner-grouped"><Users />{task.responsable}</div></div>
            </div>)}</div>
          </section>;
        })}</div> : <div className="empty-operations"><Database /><p>No hay tareas de seguimiento registradas en este corte. La fuente no indica el motivo de la ausencia ni una regla de activación.</p></div>}
      </article>
    </div>
  </section>;
}

const questionMeta: Record<ChatKey, { label: string; hint: string }> = {
  vence: { label: 'Para hoy', hint: 'Lo más urgente para revisar' },
  avance: { label: 'Cómo vamos', hint: 'Una lectura rápida del proyecto' },
  oferta: { label: 'Con un cliente', hint: 'Qué estamos haciendo y por cuánto' },
  cruce: { label: 'El equipo', hint: 'Personas que podrían necesitar apoyo' },
  sinArrancar: { label: 'Sin arrancar', hint: 'Gantt con 0% de avance' },
  ofertaVsLicitacion: { label: 'Licitación vs. Oferta', hint: 'En qué se diferencian' },
  pipeline: { label: 'Resumen del pipeline', hint: 'Todo el corte de un vistazo' },
  moneda: { label: 'Un dato que falta', hint: 'Cuando la fuente no lo trae' },
  fianzaVence: { label: 'Fianzas', hint: 'Vista de concepto · ilustrativo' },
  cobranza: { label: 'Cobranza', hint: 'Vista de concepto · ilustrativo' },
  avanceObra: { label: 'Avance de obra', hint: 'Vista de concepto · ilustrativo' },
  cruceAutomatico: { label: 'Cruce automático', hint: 'Vista de concepto · motor de matching' },
  cruceSinVincular: { label: 'Sin vincular', hint: 'Vista de concepto · motor de matching' },
};

function matchChatQuestion(value: string): ChatKey | null {
  const normalized = value.toLocaleLowerCase('es-MX');
  if (/crucé|cruzaron|vincul|automátic|automatic/.test(normalized)) return 'cruceAutomatico';
  if (/sin vincular|no se cruzaron|quedaron sin/.test(normalized)) return 'cruceSinVincular';
  if (/fianza|garant[ií]a|p[oó]liza|aseguradora/.test(normalized)) return 'fianzaVence';
  if (/cobranza|cobrar|cartera|facturad|pagad/.test(normalized)) return 'cobranza';
  if (/avance de obra|bit[aá]cora|avance f[ií]sico/.test(normalized)) return 'avanceObra';
  if (/moneda|divisa/.test(normalized)) return 'moneda';
  if (/diferencia|vs\.?|versus|distinci[oó]n/.test(normalized)) return 'ofertaVsLicitacion';
  if (/resumen|pipeline|panorama general/.test(normalized)) return 'pipeline';
  if (/sin arrancar|sin iniciar|0%|sin avance/.test(normalized)) return 'sinArrancar';
  if (/urge|hoy|atenci[oó]n|vence|fallo|fecha|hito|decisi[oó]n/.test(normalized)) return 'vence';
  if (/oferta|monto|empresa|comercial|cliente|kiva/.test(normalized)) return 'oferta';
  if (/avance|tarea|entregable|tramo|proyecto|cómo vamos|como vamos/.test(normalized)) return 'avance';
  if (/responsable|asignad|carga|quien|quién|equipo|apoyo|bloqueo/.test(normalized)) return 'cruce';
  return null;
}

function IntelligencePanel({ open, onOpenChange, onDetail }: { open:boolean; onOpenChange:(v:boolean)=>void; onDetail:(v:Licitacion)=>void }) {
  const [messages, setMessages] = useState<Array<{ key: ChatKey; question: string }>>([]);
  const [draft, setDraft] = useState('');
  const [unsupported, setUnsupported] = useState('');
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages]);

  const ask = (key: ChatKey, question = chatAnswers[key].question) => {
    setMessages((current) => [...current, { key, question }]);
    setUnsupported('');
    setDraft('');
  };
  const submit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question) return;
    const key = matchChatQuestion(question);
    if (!key) {
      setUnsupported(question);
      setDraft('');
      return;
    }
    ask(key, question);
  };

  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="intelligence-sheet" side="right">
    <SheetHeader className="intelligence-head">
      <div className="intelligence-title"><div><SheetTitle>Consultas del corte</SheetTitle><span className="assistant-status"><i /> Respuestas guiadas</span></div><SheetDescription>Consultas preparadas para esta demostración; no es IA generativa.</SheetDescription></div>
      {(messages.length > 0 || unsupported) && <button className="clear-chat" onClick={() => { setMessages([]); setUnsupported(''); }} aria-label="Iniciar nueva conversación"><RotateCcw /> Reiniciar</button>}
    </SheetHeader>
    <div className="chat-body" aria-live="polite">
      <div className="chat-welcome">
        <span className="bot-avatar"><Database /></span>
        <div className="assistant-bubble"><p>¿Qué quieres consultar?</p><span>Elige una de las cuatro preguntas sugeridas o escribe palabras clave sobre fechas, avance, equipo u ofertas. Las respuestas usan datos precargados.</span></div>
      </div>

      {messages.length === 0 && <section className="suggested-questions" aria-label="Preguntas sugeridas">
        <div className="suggestions-heading"><span>Preguntas sugeridas</span></div>
        <div className="question-chips">{(Object.keys(chatAnswers) as ChatKey[]).map((key) => <button key={key} onClick={() => ask(key)}><span>{questionMeta[key].label}</span><strong>{chatAnswers[key].question}</strong><small>{questionMeta[key].hint}</small><ArrowRight /></button>)}</div>
      </section>}

      {unsupported && <div className="unsupported-reply" aria-live="polite"><strong>No encontré una consulta guiada para:</strong><span>“{unsupported}”</span><p>Prueba con una de las preguntas sugeridas o usa palabras como “fallo”, “avance”, “equipo” u “oferta”.</p></div>}
      {messages.map((message, index) => {
        const answer = chatAnswers[message.key];
        return <div className="conversation-turn" key={`${message.key}-${index}`}>
          <div className="user-message">{message.question}</div>
          <div className="ai-message answer"><span className="bot-avatar"><Database /></span><div className="assistant-response"><p>{answer.answer}</p>{answer.tender && <button className="result-card" onClick={() => { onDetail(answer.tender!); onOpenChange(false); }}><div><span>Expediente relacionado</span><strong>{answer.tender.nombre}</strong><small>{answer.tender.numero}</small></div><ChevronRight /></button>}<div className="response-source"><Database /><span>Fuente: {answer.source}</span></div></div></div>
        </div>;
      })}
      <div ref={chatEnd} />
    </div>
    <div className="chat-footer">
      {messages.length > 0 && <div className="quick-prompts"><span className="quick-prompts-label">Continuar con</span><div className="quick-prompt-list">{(Object.keys(chatAnswers) as ChatKey[]).filter((key) => !messages.some((message) => message.key === key)).slice(0, 2).map((key) => <button key={key} onClick={() => ask(key)}><span>{questionMeta[key].label}</span><ArrowRight /></button>)}</div></div>}
      <form className="chat-composer" onSubmit={submit}><Search className="chat-composer-icon" aria-hidden="true" /><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Pregunta por fechas, avance, equipo u ofertas" aria-label="Buscar en las consultas guiadas" /><button type="submit" disabled={!draft.trim()} aria-label="Enviar consulta"><ArrowRight /></button></form>
      <div className="chat-context"><Database /><span>Contenido precargado · corte {fuentes.corte}</span></div>
    </div>
  </SheetContent></Sheet>;
}
