'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronLeft,
  ChevronRight, Database, FileStack, Filter, Gauge, GitMerge, Lock,
  MapPin, Search, TrendingUp, Users, X, ArrowRight,
  Building2, Wallet, HardHat, UserRound, MessageCircle, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  bondsPorVencer, bondsPorVencerDe, cobranzaConsolidada, diasEntreFallo, diasParaVencer, montoTotal, proyectoPorId, proyectos, semaforoDesfase, totalFacturado,
  matchResultPorProyecto, matchResultPorLicitacion, matchResults, riesgoPortafolio,
} from '@/lib/mock-data-finanzas-obra';
import { fmtMXN, licitacionPorId as licitacionPorIdSafe } from '@/lib/mock-data-helpers';
import { usePortfolio } from '@/lib/portfolio-store';

type View = 'panorama' | 'licitaciones' | 'ofertas' | 'detalle' | 'finanzas' | 'obra';
type RoutedView = Exclude<View, 'detalle'>;

const viewRoutes: Record<RoutedView, string> = {
  panorama: '/',
  licitaciones: '/licitaciones',
  ofertas: '/ofertas',
  finanzas: '/finanzas',
  obra: '/obra',
};
type ChatKey = 'vence' | 'avance' | 'oferta' | 'cruce' | 'sinArrancar' | 'ofertaVsLicitacion' | 'pipeline' | 'moneda' | 'fianzaVence' | 'cobranza' | 'avanceObra' | 'cruceAutomatico' | 'cruceSinVincular';
type ModelContext = { registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> };

// --- Módulos adicionales. Las páginas operativas viven en una sola navegación;
// RH permanece como módulo no conectado sin duplicar Licitaciones, Finanzas u Obra.
type ModuloKey = 'rh';
const moduloInfo: Record<ModuloKey, { label: string; icon: typeof Building2 }> = {
  rh: { label: 'RH', icon: UserRound },
};
// RH reusa el diálogo "no conectado" ya construido para el mapa de fuentes.
const modulosNoConectados: { key: string; label: string; hoy: string; con: string }[] = [
  {
    key: 'rh',
    label: 'RH',
    hoy: `Hoy sabes: ${carga.reduce((s, c) => s + c.asignaciones, 0)} tareas repartidas entre ${carga.length} personas, por el Excel de Gantt.`,
    con: 'Con el módulo de RH verías la capacidad real del equipo, quién está disponible para tomar más trabajo, y dónde hace falta contratar.',
  },
];

const MODULO_ESTADO: Record<ModuloKey, 'no_conectado'> = { rh: 'no_conectado' };

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

// Caso real: ALICIA tiene tareas abiertas en dos expedientes con fallo próximo (Tramo II 08-oct, Tramo III 30-sep) —
// usado por el hallazgo "Capacidad de Alicia" en Dashboard.
const tramoIICapacidad = licitacionPorId('E-2026-00080053');
const tramoIIICapacidad = licitacionPorId('XLS-LO09JZO009JZO001N342026');

const aliciaAbiertasTramoII = tramoIICapacidad.tareas!.filter((t) => t.responsable === 'ALICIA' && t.avance < 100);
const aliciaAbiertasTramoIII = tramoIIICapacidad.tareas!.filter((t) => t.responsable === 'ALICIA' && t.avance < 100);
const aliciaCarga = carga.find((c) => c.nombre === 'Alicia')!;

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
              <Wallet className="nav-icon" /><span className="nav-copy">Finanzas</span>
            </Button>
            <Button variant="ghost" aria-label="Obra, vista de concepto" aria-current={view === 'obra' ? 'page' : undefined} className={`nav-item ${view === 'obra' ? 'active' : ''}`} onClick={() => navigate('obra')}>
              <HardHat className="nav-icon" /><span className="nav-copy">Obra</span>
            </Button>
          </div>
        </nav>
        <ModuleBar onModuleClick={(key) => setModuloAbierto(key)} />
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
            <h1>{view === 'panorama' ? 'Panorama operativo' : view === 'licitaciones' ? 'Licitaciones unificadas' : view === 'ofertas' ? 'Ofertas' : view === 'finanzas' ? 'Finanzas' : view === 'obra' ? 'Obra' : 'Detalle del expediente'}</h1>
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
          {view === 'detalle' && selected && <DetailView item={selected} onBack={() => navigate('licitaciones')} onGoToFinance={() => navigate('finanzas')} />}
        </div>
      </section>

      {!chatOpen && <button className="assistant-fab" onClick={() => setChatOpen(true)} aria-label="Abrir consultas operativas"><MessageCircle /><span>Consultas operativas</span></button>}
      <IntelligencePanel open={chatOpen} onOpenChange={setChatOpen} onDetail={openDetail} />
    </main>
  );
}

type Licitation = Licitacion;

function ModuleBar({ onModuleClick }: { onModuleClick: (key: ModuloKey) => void }) {
  const modulos: ModuloKey[] = ['rh'];
  return <nav className="module-bar" aria-label="Módulos adicionales">
    <span className="module-bar-label">Módulos</span>
    <div className="module-bar-list">
      {modulos.map((key) => {
        const info = moduloInfo[key];
        const estado = MODULO_ESTADO[key];
        const conectado = estado !== 'no_conectado';
        return <button
          key={key}
          className={`module-pill ${conectado ? 'on' : 'off'}`}
          aria-haspopup={conectado ? undefined : 'dialog'}
          title={conectado ? undefined : 'Vista de demostración: módulo no conectado'}
          onClick={() => onModuleClick(key)}
        ><info.icon />{info.label}{!conectado && <Lock className="module-pill-lock" />}</button>;
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
  const puertoVallarta = licitacionPorId('XLS-SIOPESMA0BLP05692026');
  const tramoIII = licitacionPorId('XLS-LO09JZO009JZO001N342026');
  const tareasPuertoSinIniciar = puertoVallarta.tareas?.filter((tarea) => tarea.avance === 0).length ?? 0;
  const tareasTramoIIISinIniciar = tramoIII.tareas?.filter((tarea) => tarea.avance === 0).length ?? 0;
  const tareasAliciaConFallo = [...aliciaAbiertasTramoII, ...aliciaAbiertasTramoIII];
  const entityBars = porEntidad.slice(0, 5);
  const portfolio = usePortfolio();
  const cobranza = cobranzaConsolidada(portfolio.proyectos, portfolio.invoices, portfolio.payments, portfolio.addendas);
  const bondsPorVencerLive = bondsPorVencerDe(portfolio.bonds);
  const executionRows = portfolio.proyectos.map((proyecto) => {
    const total = montoTotal(proyecto.id, portfolio.addendas, portfolio.proyectos);
    const facturado = totalFacturado(proyecto.id, portfolio.invoices);
    const { desfase, nivel } = semaforoDesfase(proyecto.id, portfolio.invoices, portfolio.addendas, portfolio.proyectos);
    return { proyecto, facturadoPct: total > 0 ? Math.round((facturado / total) * 100) : 0, desfase, nivel };
  }).sort((a, b) => b.desfase - a.desfase).slice(0, 3);
  const fianzasProximas = bondsPorVencerLive.slice(0, 2).map((fianza) => {
    const proyecto = portfolio.proyectos.find((p) => p.id === fianza.proyectoId) ?? proyectoPorId(fianza.proyectoId);
    const match = matchResultPorProyecto(fianza.proyectoId);
    const licitacion = match?.licitacionId ? licitacionPorIdSafe(match.licitacionId) : undefined;
    return { fianza, proyecto, dias: diasParaVencer(fianza), licitacion };
  }).filter((item): item is typeof item & { proyecto: NonNullable<typeof item.proyecto> } => Boolean(item.proyecto));
  // Único hallazgo de las 4 filas que cruza hasta el Tablero de Proyectos (ilustrativo), no solo
  // ComprasMX × Gantt: combina desfase avance/facturación + fianza vs. fallo + carga de equipo
  // en una sola pregunta de negocio (docs/ejemplo-ilustrativo-cruce.md §3.6). Se recalcula sobre
  // el estado editable del portafolio, así que agregar/editar una factura aquí puede mover este
  // hallazgo en vivo.
  const riesgoTop = riesgoPortafolio(portfolio.proyectos, portfolio.invoices, portfolio.bonds, portfolio.addendas)[0];
  const riesgoMatch = riesgoTop ? matchResultPorProyecto(riesgoTop.proyecto.id) : undefined;
  const riesgoLicitacion = riesgoMatch?.licitacionId ? licitacionPorIdSafe(riesgoMatch.licitacionId) : undefined;
  const alertas = [
    {
      level: 'alto',
      label: 'Atención alta',
      title: 'Puerto Vallarta',
      summary: `Fallo el ${puertoVallarta.fallo}: ${tareasPuertoSinIniciar} tareas siguen en 0%.`,
      evidence: [`ComprasMX · fallo ${puertoVallarta.fallo}`, `Gantt · ${tareasPuertoSinIniciar} de ${puertoVallarta.tareas?.length ?? 0} tareas en 0%`],
      sourceText: 'ComprasMX × Excel de Gantt',
      onOpen: () => onDetail(puertoVallarta),
    },
    {
      level: 'medio',
      label: 'Atención media',
      title: 'Tramo III · ATTRAPI',
      summary: `Fallo el ${tramoIII.fallo}: ${tareasTramoIIISinIniciar} tareas todavía no arrancan.`,
      evidence: [`ComprasMX · fallo ${tramoIII.fallo}`, `Gantt · ${tareasTramoIIISinIniciar} de ${tramoIII.tareas?.length ?? 0} tareas en 0%`],
      sourceText: 'ComprasMX × Excel de Gantt',
      onOpen: () => onDetail(tramoIII),
    },
    {
      level: 'medio',
      label: 'Atención media',
      title: 'Capacidad de Alicia',
      summary: `Tiene ${tareasAliciaConFallo.length} tareas abiertas repartidas en 2 expedientes con fallo próximo.`,
      evidence: [`Gantt · ${aliciaCarga.asignaciones} tareas asignadas`, `ComprasMX · 2 fallos próximos`],
      sourceText: 'Excel de Gantt × ComprasMX',
      onOpen: () => onDetail(tramoIIICapacidad),
    },
    ...(riesgoTop ? [{
      level: riesgoTop.nivel === 'alto' ? 'alto' : 'medio',
      label: riesgoTop.nivel === 'alto' ? 'Atención alta' : 'Atención media',
      title: riesgoTop.proyecto.name,
      summary: riesgoTop.razones.length > 0 ? riesgoTop.razones.join(' · ') : 'Proyecto adjudicado con señales combinadas de riesgo.',
      evidence: riesgoLicitacion
        ? [`ComprasMX × Tablero · vinculado con ${riesgoLicitacion.numero}`, `Fallo real ${riesgoLicitacion.fallo ?? 'sin fecha'}`]
        : [`Tablero de Proyectos · ${riesgoTop.proyecto.client}`, 'Sin expediente vinculado automáticamente (por debajo del umbral de confianza)'],
      sourceText: 'ComprasMX × Excel de Gantt × Tablero de Proyectos',
      onOpen: () => onNavigateView('finanzas'),
    }] : []),
  ];

  const sources = [
    { label: 'ComprasMX', type: 'Cruce activo', detail: 'Fechas de fallo, etapa y expediente', icon: FileStack, view: 'licitaciones' as View, status: 'active' },
    { label: 'Excel de Gantt', type: 'Cruce activo', detail: 'Tareas, avance y responsables', icon: Users, view: 'licitaciones' as View, status: 'active' },
    { label: 'Excel de Ofertas', type: 'Módulo independiente', detail: `${oferta.monto} · ${oferta.empresa}`, icon: TrendingUp, view: 'ofertas' as View, status: 'independent' },
    { label: 'Tablero de Proyectos', type: 'Vista de concepto', detail: `${portfolio.proyectos.length} proyectos ilustrativos`, icon: Building2, view: 'finanzas' as View, status: 'illustrative' },
  ];

  return <div className="executive-dashboard decision-dashboard">
    <div className="page-heading decision-heading">
      <div><p className="decision-kicker">PANORAMA DE OPERACIÓN</p><h2>Decisiones de la semana</h2><p>Hallazgos producidos al comparar fechas, avance y responsables · corte {fuentes.corte}.</p></div>
      <div className="decision-heading-actions"><span className="decision-cut"><Database />{fuentes.corte}</span><Button variant="outline" onClick={onAll}>Abrir directorio <ChevronRight /></Button></div>
    </div>

    <section className="decision-overview" aria-label="Resumen de decisiones">
      <div className="decision-overview-lead"><span>PRIORIZACIÓN DEL CORTE</span><strong>{alertas.length} alertas con evidencia</strong><small>Ordenadas por fecha de fallo y trabajo pendiente.</small></div>
      <div className="decision-overview-stat"><span>Fuentes en el modelo</span><strong>{sources.length}</strong><small>{riesgoTop ? '3 cruces activos' : '2 cruces activos'} · {riesgoTop ? '1 capa complementaria' : '2 capas complementarias'}</small></div>
      <div className="decision-overview-stat"><span>Hitos próximos</span><strong>{hitos.length}</strong><small>con expediente identificable</small></div>
      <button className="decision-overview-action" onClick={onHitos}><AlertTriangle /><span><small>ACCIÓN SUGERIDA</small><strong>Revisar los {hitos.length} fallos próximos</strong><em>Abrir expedientes con fecha clave</em></span><ChevronRight /></button>
    </section>

    <section className="decision-findings" aria-labelledby="decision-findings-title">
      <div className="decision-section-heading"><div><h3 id="decision-findings-title">Hallazgos que requieren decisión</h3><p>Cada fila combina al menos dos fuentes y muestra la evidencia que la origina.</p></div><span>{alertas.length} prioridades</span></div>
      <div className="decision-finding-list">
        {alertas.map((alerta) => <button className="decision-finding-row" key={alerta.title} onClick={alerta.onOpen} aria-label={`Abrir evidencia de ${alerta.title}`}>
          <span className={`decision-level decision-level-${alerta.level}`}>{alerta.label}</span>
          <div className="decision-finding-copy"><strong>{alerta.title}</strong><span>{alerta.summary}</span><div className="decision-evidence">{alerta.evidence.map((item) => <small key={item}>{item}</small>)}</div></div>
          <span className="decision-finding-source">{alerta.sourceText}</span><span className="decision-open">Abrir evidencia <ChevronRight /></span>
        </button>)}
      </div>
      <p className="decision-proof"><Database />Los hallazgos se calculan desde los datos del corte; no se mezclan con proyectos ilustrativos.</p>
    </section>

    <section className="decision-execution" aria-labelledby="decision-execution-title">
      <div className="decision-section-heading"><div><h3 id="decision-execution-title">Ejecución de adjudicados</h3><p>La segunda capa del panorama: obra, facturación y obligaciones posteriores al fallo.</p></div><span className="decision-illustrative-badge">Datos ilustrativos · no afecta alertas reales</span></div>
      <div className="decision-execution-metrics">
        <div><span>Proyectos activos</span><strong>{portfolio.proyectos.length}</strong><small>en el tablero de proyectos</small></div>
        <div><span>Facturado del portafolio</span><strong>{fmtMXN(cobranza.facturado)}</strong><small>{fmtMXN(cobranza.pendientePorCobrar)} pendiente por cobrar</small></div>
        <div><span>Por ejercer</span><strong>{fmtMXN(cobranza.porEjercer)}</strong><small>sobre {fmtMXN(cobranza.montoTotal)} contratados</small></div>
      </div>
      <div className="decision-execution-grid">
        <article className="decision-execution-card">
          <div className="decision-execution-card-heading"><div><h4>Obra vs. facturación</h4><p>Los desfases más importantes del portafolio ilustrativo.</p></div><button onClick={() => onNavigateView('obra')}>Ver Obra <ArrowRight /></button></div>
          <ul className="decision-execution-list">
            {executionRows.map(({ proyecto, facturadoPct, desfase, nivel }) => <li key={proyecto.id}><div className="decision-execution-project"><strong>{proyecto.name}</strong><small>{proyecto.client}</small></div><div className="decision-execution-values"><div className="decision-execution-measure"><span>Obra <b>{proyecto.progress}%</b></span><i><i style={{ width: `${proyecto.progress}%` }} /></i></div><div className="decision-execution-measure"><span>Facturado <b>{facturadoPct}%</b></span><i><i style={{ width: `${facturadoPct}%` }} /></i></div><em className={`decision-drift-${nivel}`}>{desfase} pts</em></div></li>)}
          </ul>
          <p className="decision-execution-note"><Database />Cruce conceptual: avance físico del tablero contra facturación de Finanzas.</p>
        </article>

        <article className="decision-execution-card decision-execution-bond">
          <div className="decision-execution-card-heading"><div><h4>Fianza por vencer</h4><p>Obligación post-adjudicación que hoy queda fuera de ComprasMX.</p></div><button onClick={() => onNavigateView('finanzas')}>Ver Finanzas <ArrowRight /></button></div>
          {fianzasProximas.length ? <ul className="decision-bond-list">{fianzasProximas.map(({ fianza, proyecto, dias, licitacion }) => <li key={fianza.id}><div className="decision-bond-date"><strong>{dias}</strong><small>días</small></div><div className="decision-bond-copy"><strong>{proyecto.name}</strong><span>Vence el {fianza.expiryDate} · {fianza.type}</span>{licitacion ? <small>Origen cruzado: {licitacion.dependencia} · fallo {licitacion.fallo ?? 'sin fecha'}</small> : <small className="decision-bond-unmatched"><AlertTriangle />Sin expediente de origen vinculado automáticamente (por debajo del umbral de confianza) · revisar a mano</small>}</div></li>)}</ul> : <p className="decision-execution-empty">No hay fianzas próximas a vencer.</p>}
          <p className="decision-execution-note"><Database />La demostración usa contratos, facturas y fianzas ilustrativos, no datos reales de GAIP.</p>
        </article>
      </div>
    </section>

    <section className="decision-context" aria-labelledby="decision-context-title">
      <div className="decision-section-heading"><div><h3 id="decision-context-title">Contexto operativo del corte</h3><p>La lectura completa que acompaña a las prioridades: volumen, fechas, equipo y concentración.</p></div><span>{fuentes.totalProcesosUnicos} procesos únicos</span></div>
      <div className="decision-context-grid">
        <div className="decision-context-column">
          <article className="decision-context-card decision-context-pipeline">
            <div className="decision-context-card-heading"><div><h4>Pipeline por etapa</h4><p>Registros del corte por estado</p></div><strong>{fuentes.totalRegistrosRecibidos}</strong></div>
            <div className="decision-pipeline-list">
              {stages.map((stage) => <div className="decision-pipeline-row" key={stage.label}><div className="decision-pipeline-label"><span>{stage.label}</span><strong>{stage.value}</strong></div><div className="decision-pipeline-bar"><i style={{ width: `${Math.min(100, Math.max(8, (stage.value / Math.max(...stages.map((item) => item.value))) * 100))}%`, background: stage.color }} /></div></div>)}
            </div>
            <p className="decision-context-note"><Database />Los conteos vienen de listas de origen y pueden repetirse entre etapas.</p>
          </article>

          <article className="decision-context-card decision-context-workload">
            <div className="decision-context-card-heading"><div><h4>Carga del equipo</h4><p>Tareas asignadas y avance promedio</p></div><Users /></div>
            <div className="decision-workload-list">
              {carga.map((person) => <div className="decision-workload-row" key={person.nombre}><div><strong>{person.nombre}</strong><small>{person.asignaciones} tareas</small></div><b>{person.avance}%</b><span className="decision-workload-bar"><i style={{ width: `${person.avance}%` }} /></span></div>)}
            </div>
          </article>
        </div>

        <div className="decision-context-column">
          <article className="decision-context-card decision-context-deadlines">
            <div className="decision-context-card-heading"><div><h4>Próximos fallos</h4><p>Fechas clave del corte</p></div><button onClick={onHitos}>Ver todos <ArrowRight /></button></div>
            <ul className="decision-deadline-list">
              {hitos.slice(0, 4).map((hito) => { const item = licitacionPorId(hito.id); const [dia, mes] = hito.fecha.split(' '); return <li key={item.id}><button onClick={() => onDetail(item)}><span className="decision-date"><strong>{dia}</strong><small>{mes.toUpperCase()}</small></span><span className="decision-deadline-copy"><strong>{item.dependencia}</strong><small>{item.nombre}</small></span><ChevronRight /></button></li>; })}
            </ul>
          </article>

          <article className="decision-context-card decision-context-entities">
            <div className="decision-context-card-heading"><div><h4>Concentración por entidad</h4><p>Procesos únicos identificados</p></div><MapPin /></div>
            <div className="decision-entity-list">
              {entityBars.map((bar) => <div className="decision-entity-row" key={bar.name}><span>{bar.name}</span><div><i style={{ width: `${(bar.value / entityBars[0].value) * 100}%` }} /></div><strong>{bar.value}</strong></div>)}
            </div>
          </article>
        </div>
      </div>
    </section>

    <section className="decision-sources" aria-labelledby="decision-sources-title">
      <div className="decision-section-heading"><div><h3 id="decision-sources-title">Cómo se llegó a estas decisiones</h3><p>Las fuentes tienen roles distintos dentro del modelo. No todas alimentan el ranking.</p></div><span>{sources.length} fuentes · 2 cruces activos</span></div>
      <div className="decision-source-grid">
        {sources.map((source) => <button className={`decision-source-card decision-source-${source.status}`} key={source.label} onClick={() => onNavigateView(source.view)}>
          <span className="decision-source-icon"><source.icon /></span><span className="decision-source-copy"><strong>{source.label}</strong><small>{source.type}</small><em>{source.detail}</em></span><ChevronRight className="decision-source-arrow" />
        </button>)}
      </div>
    </section>

    <section className="decision-quality" aria-labelledby="decision-quality-title">
      <div className="decision-section-heading"><div><h3 id="decision-quality-title">Calidad y cobertura del corte</h3><p>Contexto del modelo para interpretar las alertas; no es un segundo ranking.</p></div><Button variant="ghost" size="sm" onClick={onAll}>Ver directorio <ArrowRight /></Button></div>
      <div className="decision-quality-grid">
        <div><span>Procesos únicos</span><strong>{fuentes.totalProcesosUnicos}</strong><small>de {fuentes.totalRegistrosRecibidos} registros recibidos</small></div>
        <div><span>Duplicados conciliados</span><strong>{fuentes.totalDuplicados}</strong><small>desde {fuentes.totalListasOrigen} listas de origen</small></div>
        <div><span>Cobertura del corte</span><strong>{Math.round((fuentes.totalProcesosUnicos / fuentes.totalRegistrosRecibidos) * 100)}%</strong><small>registros convertidos en procesos únicos</small></div>
        <div><span>Histórico disponible</span><strong>{historicoResumen.totalExpedientes.toLocaleString('es-MX')}</strong><small>{historicoResumen.totalSnapshots} cortes consolidados</small></div>
      </div>
      <div className="decision-quality-note"><Database /><span>{fuentes.totalInvitacionesSinProcesar.toLocaleString('es-MX')} invitaciones siguen fuera del pipeline porque todavía esperan filtro de GAIP.</span></div>
    </section>
  </div>;
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

function DetailView({ item, onBack, onGoToFinance }: { item:Licitacion; onBack:()=>void; onGoToFinance:()=>void }) {
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

    {proyecto && <button type="button" className="detail-bridge" onClick={onGoToFinance}>
      <GitMerge />
      <div>
        <strong>Este expediente ya tiene proyecto activo: {proyecto.name}</strong>
        <span>Ver cobranza y fianzas cruzadas en Finanzas</span>
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
