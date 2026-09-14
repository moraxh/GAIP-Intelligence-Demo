'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  AlertTriangle, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronLeft,
  ChevronRight, Database, FileStack, Filter, Gauge, Lock,
  MapPin, NotebookPen, Search, TrendingUp, Users, X, ArrowRight, ThumbsDown, ThumbsUp,
  Building2, Wallet, HardHat, UserRound, MessageCircle, RotateCcw, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  carga, fuentes, hitos, historicoResumen, licitaciones, notas, oferta, ofertas,
  porEntidad, stages, type Estado, type Licitacion,
} from '@/lib/mock-data';

type View = 'panorama' | 'licitaciones' | 'ofertas' | 'detalle';
type ChatKey = 'vence' | 'avance' | 'oferta' | 'cruce';
type ModelContext = { registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> };

// --- Datos visibles del panorama en esta demostración. ---
// Pieza 1 del Plan_Demo_v2.md — cada widget del panorama depende de una fuente concreta.
type FuenteKey = 'comprasmx' | 'gantt' | 'ofertas' | 'historico';
type FuentesActivas = Record<FuenteKey, boolean>;

const fuenteInfo: Record<FuenteKey, { label: string; corto: string; detalle: string }> = {
  comprasmx: { label: 'ComprasMX', corto: 'ComprasMX', detalle: 'Plataforma de licitaciones de Beto: descarga, filtro y listado' },
  gantt: { label: 'Excel de Gantt', corto: 'Gantt', detalle: 'Seguimiento operativo por expediente: tareas, avance y responsable' },
  ofertas: { label: 'Excel de Ofertas', corto: 'Ofertas', detalle: 'Seguimiento comercial: empresa, monto y estatus' },
  historico: { label: 'Histórico (60 cortes)', corto: 'Histórico', detalle: '3,217 expedientes detectados en 60 días de cortes diarios' },
};

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
// RH/Finanzas/Obra reusan el diálogo "no conectado" ya construido para el mapa de fuentes —
// mismas reglas de honestidad visual: sin salida propia, solo el estado gris.
const modulosNoConectados: { key: string; label: string; hoy: string; con: string }[] = [
  {
    key: 'rh',
    label: 'RH',
    hoy: `Hoy sabes: ${carga.reduce((s, c) => s + c.asignaciones, 0)} tareas repartidas entre ${carga.length} personas, por el Excel de Gantt.`,
    con: 'Con el módulo de RH verías la capacidad real del equipo, quién está disponible para tomar más trabajo, y dónde hace falta contratar.',
  },
  {
    key: 'finanzas',
    label: 'Finanzas',
    hoy: `Hoy sabes: ofertaste ${oferta.monto} en ${oferta.proyecto}.`,
    con: 'Con el módulo de Finanzas verías el estado de cuenta de cada proyecto, no solo de licitaciones: flujo de caja, cuentas por cobrar y el margen real detrás de cada oferta.',
  },
  {
    key: 'obra',
    label: 'Obra',
    hoy: `Hoy sabes: ${licitaciones.filter((l) => l.estado === 'Construcción').length} expedientes están en etapa de construcción, según ComprasMX.`,
    con: 'Con el módulo de Obra verías el avance físico real en sitio: bitácora, incidencias y fotografías, cruzado contra el Gantt administrativo de cada expediente.',
  },
];

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
};

// --- Pieza 3: Capacidad vs. Demanda — el cruce Gantt x fechas de fallo que ComprasMX no puede hacer. ---
// Caso real: ALICIA tiene tareas abiertas en dos expedientes con fallo próximo (Tramo II 08-oct, Tramo III 30-sep);
// LUIS tiene una sola tarea abierta, en un expediente sin fecha de fallo registrada todavía y más avanzada (82km, 60%).
const tramoIICapacidad = licitacionPorId('E-2026-00080053');
const tramoIIICapacidad = licitacionPorId('XLS-LO09JZO009JZO001N342026');
const km82Capacidad = licitacionPorId('E-2026-00084041');

const aliciaAbiertasTramoII = tramoIICapacidad.tareas!.filter((t) => t.responsable === 'ALICIA' && t.avance < 100);
const aliciaAbiertasTramoIII = tramoIIICapacidad.tareas!.filter((t) => t.responsable === 'ALICIA' && t.avance < 100);
const luisAbiertas82km = km82Capacidad.tareas!.filter((t) => t.responsable === 'LUIS' && t.avance < 100);
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

export default function Home() {
  const [view, setView] = useState<View>('panorama');
  const [selected, setSelected] = useState<Licitation | null>(null);
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<'Todos' | Estado>('Todos');
  const [entityFilter, setEntityFilter] = useState('Todas');
  const [tenderPage, setTenderPage] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  // Pieza 1: solo ComprasMX prendido por defecto — así arranca la demo mostrando lo que Beto ya tiene.
  const [fuentesActivas, setFuentesActivas] = useState<FuentesActivas>({
    comprasmx: true, gantt: false, ofertas: false, historico: false,
  });
  const toggleFuente = (key: FuenteKey) => setFuentesActivas((prev) => ({ ...prev, [key]: !prev[key] }));

  const [moduloAbierto, setModuloAbierto] = useState<string | null>(null);

  const openDetail = (item: Licitacion) => { setSelected(item); setView('detalle'); };
  const navigate = (next: View) => { setView(next); if (next !== 'detalle') setSelected(null); };
  const activeNavOffset = (view === 'panorama' ? 0 : view === 'ofertas' ? 2 : 1) * 48;
  const moduloActivo: ModuloKey = 'licitaciones';
  const modulosGris = modulosNoConectados.find((m) => m.key === moduloAbierto);

  const filtered = useMemo(() => licitaciones.filter((item) => {
    const text = `${item.numero} ${item.nombre} ${item.dependencia} ${item.entidad}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (stateFilter === 'Todos' || item.estado === stateFilter) && (entityFilter === 'Todas' || item.entidad === entityFilter);
  }), [query, stateFilter, entityFilter]);

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
  }, []);

  return (
    <main className="app-shell">
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <ModuleBar activo={moduloActivo} onLicitaciones={() => navigate('panorama')} onGris={(key) => setModuloAbierto(key)} />
      {modulosGris && <GraySourceDialog label={modulosGris.label} hoy={modulosGris.hoy} con={modulosGris.con} onClose={() => setModuloAbierto(null)} />}
      <aside className="sidebar">
        <div className="brand-lockup">
          <Image src="/gaip-logo.png" alt="GAIP — Gerenciación, Administración e Ingeniería de Proyectos" width={184} height={75} unoptimized priority />
          <span className="brand-product">Intelligence</span>
        </div>
        <nav aria-label="Navegación principal">
          <p className="nav-section-heading">Operación</p>
          <div className="nav-items" style={{ '--nav-offset': `${activeNavOffset}px` } as React.CSSProperties}>
            <span className="nav-highlight" aria-hidden="true" />
            <Button variant="ghost" aria-label="Resumen ejecutivo" aria-current={view === 'panorama' ? 'page' : undefined} className={`nav-item ${view === 'panorama' ? 'active' : ''}`} onClick={() => navigate('panorama')}>
              <Gauge className="nav-icon" /><span className="nav-copy">Resumen</span>
            </Button>
            <Button variant="ghost" aria-label={`Licitaciones, ${fuentes.totalProcesosUnicos} procesos únicos`} aria-current={view === 'licitaciones' || view === 'detalle' ? 'page' : undefined} className={`nav-item ${view === 'licitaciones' || view === 'detalle' ? 'active' : ''}`} onClick={() => navigate('licitaciones')}>
              <FileStack className="nav-icon" /><span className="nav-copy">Licitaciones</span><span className="nav-count">{fuentes.totalProcesosUnicos}</span>
            </Button>
            <Button variant="ghost" aria-label={`Ofertas, ${oferta ? 1 : 0} en seguimiento`} aria-current={view === 'ofertas' ? 'page' : undefined} className={`nav-item ${view === 'ofertas' ? 'active' : ''}`} onClick={() => navigate('ofertas')}>
              <BriefcaseBusiness className="nav-icon" /><span className="nav-copy">Ofertas</span><span className="nav-count">{oferta ? 1 : 0}</span>
            </Button>
          </div>
        </nav>
        <div className="sidebar-footer">
          <div className="profile-card">
            <span className="avatar">AG</span>
            <span className="profile-copy"><strong>Alberto García</strong><small>Dirección</small></span>
          </div>
        </div>
      </aside>

      <section className="workspace" id="main-content" tabIndex={-1}>
        <header className="topbar">
          <div>
            <div className="eyebrow">INTELIGENCIA OPERATIVA</div>
            <h1>{view === 'panorama' ? 'Panorama operativo' : view === 'licitaciones' ? 'Licitaciones unificadas' : view === 'ofertas' ? 'Ofertas' : 'Detalle del expediente'}</h1>
          </div>
          <div className="top-actions">
            <div className="data-status">
              <span className="data-mark"><CalendarDays /></span>
              <div className="data-status-copy"><strong>Corte de datos</strong><time>{fuentes.corte}</time></div>
            </div>
          </div>
        </header>

        <div className="content">
          {view === 'panorama' && <Dashboard fuentesActivas={fuentesActivas} onToggle={toggleFuente} onAll={() => navigate('licitaciones')} onDetail={openDetail} />}
          {view === 'licitaciones' && (fuentesActivas.comprasmx
            ? <LicitacionesView
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
              />
            : <ViewLocked fuente="comprasmx" onToggle={() => toggleFuente('comprasmx')} />)}
          {view === 'ofertas' && <OfertasView />}
          {view === 'detalle' && selected && <DetailView item={selected} onBack={() => navigate('licitaciones')} />}
        </div>
      </section>

      <button className="assistant-fab" onClick={() => setChatOpen(true)} aria-label="Abrir consultas operativas"><MessageCircle /><span>Consultas operativas</span></button>
      <IntelligencePanel open={chatOpen} onOpenChange={setChatOpen} onDetail={openDetail} />
    </main>
  );
}

type Licitation = Licitacion;

// --- Pieza 5: barra de módulos de empresa. Encuadra Licitaciones como UN módulo, no el producto. ---
function ModuleBar({ activo, onLicitaciones, onGris }: { activo: ModuloKey; onLicitaciones: () => void; onGris: (key: string) => void }) {
  const modulos: ModuloKey[] = ['licitaciones', 'rh', 'finanzas', 'obra'];
  return <nav className="module-bar" aria-label="Módulos de la empresa">
    <span className="module-bar-label">GAIP ·</span>
    <div className="module-bar-list">
      {modulos.map((key) => {
        const info = moduloInfo[key];
        const conectado = key === 'licitaciones';
        const isActive = key === activo;
        const onClick = key === 'licitaciones' ? onLicitaciones : () => onGris(key);
        return <button
          key={key}
          className={`module-pill ${conectado ? 'on' : 'off'} ${isActive ? 'active' : ''}`}
          aria-current={isActive ? 'page' : undefined}
          aria-haspopup={conectado ? undefined : 'dialog'}
          title={conectado ? undefined : 'Vista de demostración: módulo no conectado'}
          onClick={onClick}
        ><info.icon />{info.label}{!conectado && <Lock className="module-pill-lock" />}</button>;
      })}
    </div>
  </nav>;
}

// Diálogo "no conectado — qué se desbloquea": lo comparten el mapa de fuentes (Pieza 4)
// y la barra de módulos de empresa (Pieza 5). Misma regla: nunca una cifra simulada.
function GraySourceDialog({ label, hoy, con, onClose }: { label: string; hoy: string; con: string; onClose: () => void }) {
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="gray-source-panel" showCloseButton={false}>
      <DialogHeader className="gray-source-panel-head">
        <Lock aria-hidden="true" />
        <DialogTitle>{label}: no conectado</DialogTitle>
        <DialogClose className="gray-source-close" aria-label="Cerrar"><X /><span className="sr-only">Cerrar</span></DialogClose>
      </DialogHeader>
      <p className="gray-source-today">{hoy}</p>
      <DialogDescription className="gray-source-would">{con}</DialogDescription>
    </DialogContent>
  </Dialog>;
}

function FuentesToggleBar({ fuentesActivas, onToggle }: { fuentesActivas: FuentesActivas; onToggle: (key: FuenteKey) => void }) {
  const keys: FuenteKey[] = ['comprasmx', 'gantt', 'ofertas', 'historico'];
  const activeCount = keys.filter((k) => fuentesActivas[k]).length;
  return <section className="fuentes-toggle-bar" aria-label="Datos visibles en el panorama">
    <div className="fuentes-toggle-label"><span className="source-status-icon"><Database /></span><span><strong>Datos que se muestran</strong><small>Demostración · {activeCount} de {keys.length} fuentes visibles</small></span></div>
    <div className="fuentes-toggle-list">
      {keys.map((key) => <button
        key={key}
        className={`fuente-toggle ${fuentesActivas[key] ? 'on' : 'off'}`}
        aria-pressed={fuentesActivas[key]}
        aria-label={`${fuentesActivas[key] ? 'Ocultar' : 'Mostrar'} datos de ${fuenteInfo[key].corto}`}
        onClick={() => onToggle(key)}
      ><span className="fuente-toggle-dot" />{fuenteInfo[key].corto}<span className="fuente-toggle-state">{fuentesActivas[key] ? 'Visible' : 'Oculta'}</span></button>)}
    </div>
  </section>;
}

function LockedWidget({ fuente }: { fuente: FuenteKey }) {
  return <Card className="executive-card locked-widget">
    <CardContent><Lock /><strong>Requiere {fuenteInfo[fuente].label}</strong><span>Actívala en la barra de fuentes de arriba para ver este widget.</span></CardContent>
  </Card>;
}

function ViewLocked({ fuente, onToggle }: { fuente: FuenteKey; onToggle: () => void }) {
  return <div className="view-locked">
    <Lock />
    <strong>{fuenteInfo[fuente].label} está apagada</strong>
    <span>Esta vista depende de esa fuente. Actívala para verla con datos reales.</span>
    <Button onClick={onToggle}>Activar {fuenteInfo[fuente].corto}</Button>
  </div>;
}

function Dashboard({ fuentesActivas, onToggle, onAll, onDetail }: { fuentesActivas: FuentesActivas; onToggle: (key: FuenteKey) => void; onAll: () => void; onDetail: (item: Licitacion) => void }) {
  const expedientesConTareas = licitaciones.filter((item) => item.tareas?.length).length;
  const metrics = [
    { label:'Registros duplicados', value: String(fuentes.totalDuplicados), detail:'Diferencia entre registros recibidos y procesos únicos', icon:FileStack, fuente:'comprasmx' as FuenteKey },
    { label:'Expedientes históricos', value: historicoResumen.totalExpedientes.toLocaleString('es-MX'), detail:`${historicoResumen.totalSnapshots} cortes consolidados`, icon:Database, fuente:'historico' as FuenteKey },
    { label:'Expedientes con tareas', value:String(expedientesConTareas), detail:'Con avances registrados en la fuente', icon:Gauge, fuente:'gantt' as FuenteKey },
    { label:'Oferta en seguimiento', value: oferta.monto, detail:`${oferta.empresa} · ${oferta.proyecto}`, icon:TrendingUp, fuente:'ofertas' as FuenteKey },
  ];
  const hitoDestacado = hitos[0] ? licitacionPorId(hitos[0].id) : undefined;
  const notasSinExpediente = notas.filter((nota) => !nota.ligadaA).length;
  return <div className="executive-dashboard">
    <div className="page-heading"><div><h2>Resumen ejecutivo</h2><p>Corte operativo al {fuentes.corte}.</p></div><Button variant="outline" onClick={onAll}>Abrir directorio <ChevronRight /></Button></div>

    <FuentesToggleBar fuentesActivas={fuentesActivas} onToggle={onToggle} />

    {fuentesActivas.comprasmx ? <section className="consolidation-story" aria-label="Estado del corte operativo">
      <div className="story-intro"><span>ESTADO DEL CORTE</span><strong><b>{fuentes.totalProcesosUnicos}</b> procesos únicos</strong><small>Consolidados desde {fuentes.totalListasOrigen} listas de origen</small></div>
      <div className="story-step"><div><span>Registros recibidos</span><strong>{fuentes.totalRegistrosRecibidos}</strong><small>en el corte actual</small></div></div>
      <div className="story-step"><div><span>Duplicados detectados</span><strong>{fuentes.totalDuplicados}</strong><small>conciliados automáticamente</small></div></div>
      <div className="story-step featured"><div><span>Cobertura</span><strong>{Math.round((fuentes.totalProcesosUnicos / fuentes.totalRegistrosRecibidos) * 100)}%</strong><small>de registros únicos</small></div></div>
      {hitoDestacado && <button onClick={() => onDetail(hitoDestacado)}><span className="story-alert-icon"><AlertTriangle /></span><div><small>REQUIERE ATENCIÓN</small><strong>{hitos.length} hitos próximos</strong><span>Revisar prioridades del corte</span></div><ChevronRight /></button>}
    </section> : <section className="source-off-message" aria-live="polite">
      <Database aria-hidden="true" />
      <div><strong>ComprasMX está oculta en esta vista</strong><span>Activa sus datos para consultar el directorio, los hitos y el resumen del corte.</span></div>
      <Button variant="outline" onClick={() => onToggle('comprasmx')}>Mostrar datos de ComprasMX</Button>
    </section>}

    <section className="metric-grid">
      {metrics.map((metric) => fuentesActivas[metric.fuente]
        ? <Card className="executive-metric" key={metric.label}><CardHeader><div className="metric-glyph"><metric.icon /></div><span>{metric.label}</span></CardHeader><CardContent><strong>{metric.value}</strong><p>{metric.detail}</p></CardContent></Card>
        : <Card className="executive-metric locked" key={metric.label}><CardHeader><div className="metric-glyph"><Lock /></div><span>{metric.label}</span></CardHeader><CardContent><strong className="locked-value">···</strong><p>Requiere {fuenteInfo[metric.fuente].label}</p></CardContent></Card>)}
    </section>

    {fuentesActivas.comprasmx && <AiExecutiveInsights fuentesActivas={fuentesActivas} onDetail={onDetail} />}

    <section className="dashboard-card-columns">
      <div className="dashboard-card-column">
        {fuentesActivas.comprasmx ? <>
        <Card className="executive-card pipeline-card"><CardHeader><div><CardTitle>Portafolio por etapa</CardTitle><p>Conteo de registros en listas de origen por etapa</p></div><Button variant="ghost" size="sm" onClick={onAll}>Abrir listado</Button></CardHeader><CardContent><div className="pipeline-chart">{stages.map((stage) => <div className="pipeline-row" key={stage.label}><div><span>{stage.label}</span><strong>{stage.value}</strong></div><div className="pipeline-bar"><i style={{ width:`${Math.max(12, stage.value * 2.25)}%`, background:stage.color }} /></div></div>)}</div><div className="portfolio-note"><Database /><span>Los conteos pueden incluir procesos presentes en más de una lista.</span></div></CardContent></Card>
        <Card className="executive-card entity-card"><CardHeader><div><CardTitle>Procesos por entidad</CardTitle><p>Muestra operativa disponible</p></div><MapPin /></CardHeader><CardContent><div className="bar-chart">{entityBars.map((bar) => <div className="bar-row" key={bar.name}><span>{bar.name}</span><div><i style={{ width:`${(bar.value / entityBars[0].value) * 100}%` }} /></div><strong>{bar.value}</strong></div>)}</div></CardContent></Card>
        </> : <LockedWidget fuente="comprasmx" />}
        {fuentesActivas.historico && <HistoricoAnalisis />}
      </div>
      <div className="dashboard-card-column">
        {fuentesActivas.comprasmx ? <>
        <Card className="executive-card milestones-card"><CardHeader><div><CardTitle>Próximos fallos</CardTitle><p>Fechas reportadas al corte {fuentes.corte}</p></div><CalendarDays /></CardHeader><CardContent><div className="deadline-list">{hitos.map((hito) => { const item = licitacionPorId(hito.id); const [dia, mes] = hito.fecha.split(' '); return <button className="deadline" key={item.id} onClick={() => onDetail(item)}><div className="date risk"><strong>{dia}</strong><span>{mes.toUpperCase()}</span></div><div><strong>{item.dependencia}</strong><span>{item.nombre}</span></div><ChevronRight /></button>; })}</div></CardContent></Card>
        </> : <LockedWidget fuente="comprasmx" />}
        {fuentesActivas.gantt
          ? <Card className="executive-card workload-card"><CardHeader><div><CardTitle>Avance por responsable</CardTitle><p>Promedio de tareas asignadas · fuente: Excel de Gantt</p></div><Users /></CardHeader><CardContent><div className="workload-list">{carga.map((person) => <div className="workload" key={person.nombre}><div><strong>{person.nombre}</strong><span>{person.asignaciones} tareas</span></div><b>{person.avance}%</b><Progress value={person.avance} /></div>)}</div></CardContent></Card>
          : <LockedWidget fuente="gantt" />}
      </div>
    </section>

    {fuentesActivas.gantt && fuentesActivas.comprasmx && <CapacidadVsDemanda onDetail={onDetail} />}

    {notas.length > 0 && fuentesActivas.gantt && <section className="notes-section" aria-label="Notas capturadas">
      <details className="notes-disclosure">
        <summary>
          <span className="notes-disclosure-icon"><NotebookPen /></span>
          <span className="notes-disclosure-copy"><strong>Notas capturadas</strong><small>{notasSinExpediente} de {notas.length} sin expediente asociado</small></span>
          <span className="notes-disclosure-action">Ver registros <ChevronRight /></span>
        </summary>
        <div className="notes-disclosure-body">
          <p className="section-kicker">RESPONSABLE · TEXTO DE LA FUENTE</p>
          <div className="notes-list">{notas.map((nota) => { const ligada = nota.ligadaA ? licitacionPorId(nota.ligadaA) : undefined; return <div className="note-row" key={nota.id}><div className="note-owner">{nota.responsable}</div><div className="note-body"><span>{nota.texto}</span>{ligada && <button className="note-link" onClick={() => onDetail(ligada)}>{ligada.dependencia} · {ligada.numero}</button>}</div></div>; })}</div>
        </div>
      </details>
    </section>}
  </div>;
}

// Lectura editorial prototipo: el contenido está hardcodeado a partir del corte real.
// Cuando exista el servicio de IA, esta superficie puede conservarse y sustituir solo la narrativa.
function AiExecutiveInsights({ fuentesActivas, onDetail }: { fuentesActivas: FuentesActivas; onDetail: (item: Licitacion) => void }) {
  const alerta = licitacionPorId('XLS-SIOPESMA0BLP05692026');
  const primerFallo = hitos[0]?.fecha ?? 'próximamente';
  const expedienteProximo = hitos[0] ? licitacionPorId(hitos[0].id) : undefined;
  const titulo = fuentesActivas.gantt
    ? 'Puerto Vallarta vence el 17 de septiembre.'
    : `El primer fallo está fechado para el ${primerFallo}.`;
  return <section className="ai-insights" aria-labelledby="ai-insights-title">
    <div className="ai-briefing">
      <div className="ai-briefing-heading">
        <div className="briefing-meta"><span>Nota de licitaciones</span><time>{fuentes.corte}</time></div>
        <h3 id="ai-insights-title">{titulo}</h3>
      </div>
      <p>{fuentesActivas.gantt
        ? <>El expediente registra <strong>ocho tareas sin iniciar</strong>. Confirma responsables y vigencia del calendario antes de reasignar trabajo.</>
        : <>El corte incluye <strong>{hitos.length} fechas de fallo próximas</strong>. Activa Excel de Gantt para consultar tareas y responsables por expediente.</>}
      </p>
      <div className="ai-briefing-footer"><span><Database /> ComprasMX · corte {fuentes.corte}</span><button onClick={() => onDetail(alerta)}>Abrir expediente <ChevronRight /></button></div>
    </div>
    <div className="insight-stack" aria-label="Datos clave del corte">
      <h4 className="insight-stack-heading">Datos para revisar</h4>
      <div className="insight-ledger">
        {fuentesActivas.gantt
          ? <article className="insight-record critical"><span>Avance</span><div><strong>8 tareas sin iniciar</strong><p>Puerto Vallarta · fallo 17 sep · confirma responsables.</p></div></article>
          : <article className="insight-record"><span>Próximo fallo</span><div><strong>{primerFallo} · {expedienteProximo?.dependencia ?? 'Sin dependencia'}</strong><p>Revisa los requisitos de entrega del expediente.</p></div></article>}
        <article className="insight-record"><span>Concentración</span><div><strong>33 procesos · CDMX y Jalisco</strong><p>52% de los 64 procesos únicos del corte.</p></div></article>
        <article className="insight-record"><span>Etapa principal</span><div><strong>40 registros · Construcción</strong><p>49% de los registros de origen; algunos pueden aparecer en más de una lista.</p></div></article>
        {fuentesActivas.gantt && <article className="insight-record"><span>Carga por revisar</span><div><strong>44 tareas con avance menor a 45%</strong><p>Alicia, Jemo y Javier/Brenda concentran esa carga.</p></div></article>}
      </div>
    </div>
    <p className="ai-disclaimer"><Info /> Lectura editorial precargada para esta demostración. Confirma las fechas y el avance con la fuente.</p>
  </section>;
}

// --- Pieza 6: histórico como análisis, no como listado. Datos reales de historicoResumen + stages. ---
function HistoricoAnalisis() {
  const filtradas = stages.find((s) => s.label === 'Filtrada')?.value ?? 0;
  const enTrabajo = stages.find((s) => s.label === 'En trabajo')?.value ?? 0;
  const embudoPct = ((enTrabajo / historicoResumen.totalExpedientes) * 100).toFixed(2);
  return <section className="historico-analisis" aria-label="Análisis histórico">
    <Card className="executive-card">
      <CardHeader><div><CardTitle>Embudo acumulado</CardTitle><p>Conversión del universo detectado a trabajo activo</p></div><span className="history-source"><Database />{historicoResumen.totalSnapshots} cortes</span></CardHeader>
      <CardContent>
        <div className="history-layout">
          <div className="history-result"><span>CONVERSIÓN ACUMULADA</span><strong>{embudoPct}%</strong><small>del universo detectado está en trabajo activo</small></div>
          <div className="funnel-row">
            <div className="funnel-step"><strong>{historicoResumen.totalExpedientes.toLocaleString('es-MX')}</strong><span>expedientes detectados</span></div>
            <ChevronRight className="funnel-sep" />
            <div className="funnel-step"><strong>{filtradas}</strong><span>filtrados por GAIP</span></div>
            <ChevronRight className="funnel-sep" />
            <div className="funnel-step featured"><strong>{enTrabajo}</strong><span>en trabajo activo</span></div>
          </div>
        </div>
        <p className="portfolio-note-inline"><Database />{enTrabajo} en trabajo ÷ {historicoResumen.totalExpedientes.toLocaleString('es-MX')} detectados · fuente: Histórico. Cálculo determinístico.</p>
      </CardContent>
    </Card>
  </section>;
}

// --- Pieza 3: Capacidad vs. Demanda con acción y aprobación. ---
function CapacidadVsDemanda({ onDetail }: { onDetail: (item: Licitacion) => void }) {
  const [estado, setEstado] = useState<'pendiente' | 'aprobado' | 'rechazado'>('pendiente');
  const [fecha] = useState(() => new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }));
  const { sobrecargada, destino, tareaAMover } = capacidadCaso;
  return <section className="capacidad-demanda" aria-label="Capacidad versus demanda">
    <Card className="executive-card capacidad-card">
      <CardHeader><div><CardTitle>Capacidad vs. Demanda</CardTitle><p>Cruce: tareas abiertas en Gantt × fecha de fallo por expediente. Fuentes: Excel de Gantt + ComprasMX</p></div><AlertTriangle className="capacidad-alert-icon" /></CardHeader>
      <CardContent>
        <div className="capacidad-evidencia">
          <div className="capacidad-persona overloaded">
            <span className="capacidad-persona-label">SOBRECARGADA</span>
            <strong>{sobrecargada.nombre}</strong>
            <span className="capacidad-persona-stat">{sobrecargada.carga.avance}% avance promedio · {sobrecargada.carga.asignaciones} tareas asignadas</span>
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
            <span className="capacidad-persona-stat">{destino.carga.avance}% avance promedio · {destino.carga.asignaciones} tareas asignadas</span>
            <div className="capacidad-expedientes">
              <button className="capacidad-expediente" onClick={() => onDetail(destino.expediente.item)}>
                <span className="capacidad-expediente-dep">{destino.expediente.item.dependencia}</span>
                <strong>{destino.expediente.item.nombre}</strong>
                <span className="capacidad-expediente-detalle">{destino.expediente.tareas.length} tarea abierta · avance más alto del grupo</span>
              </button>
            </div>
          </div>
        </div>
        <div className="capacidad-propuesta">
          <div className="capacidad-propuesta-copy">
            <p className="section-kicker">PROPUESTA DE REASIGNACIÓN</p>
            <strong className="capacidad-propuesta-title">Reasignar una tarea económica de {sobrecargada.nombre} a {destino.nombre}</strong>
            <p>Mover <strong>&quot;{tareaAMover.nombre}&quot;</strong> del expediente <strong>{tramoIIICapacidad.numero}</strong>, con fallo el {tramoIIICapacidad.fallo}. {destino.nombre} registra {luisAbiertas82km.length ? km82Capacidad.tareas!.find((t) => t.nombre === luisAbiertas82km[0].nombre)?.avance : 0}% de avance en su única tarea abierta.</p>
          </div>
          <div className="capacidad-propuesta-action">
            {estado === 'pendiente' && <div className="capacidad-actions">
              <p className="decision-demo-note"><Info /> Simulación local: no modifica el Excel de Gantt.</p>
              <Button className="capacidad-approve" onClick={() => setEstado('aprobado')}><ThumbsUp /> Simular aprobación</Button>
              <Button variant="outline" onClick={() => setEstado('rechazado')}><ThumbsDown /> Simular rechazo</Button>
            </div>}
            {estado === 'aprobado' && <div className="capacidad-decision approved"><CheckCircle2 /><div><strong>Simulación de aprobación</strong><span>{fecha} · decisión temporal de esta sesión; la asignación de origen no cambió.</span></div></div>}
            {estado === 'rechazado' && <div className="capacidad-decision rejected"><X /><div><strong>Simulación de rechazo</strong><span>{fecha} · decisión temporal de esta sesión; no se guardó un motivo ni se cambió el origen.</span></div></div>}
          </div>
        </div>
      </CardContent>
    </Card>
  </section>;
}

function LicitacionesView(props: { query:string; setQuery:(v:string)=>void; stateFilter:'Todos'|Estado; setStateFilter:(v:'Todos'|Estado)=>void; entityFilter:string; setEntityFilter:(v:string)=>void; page:number; setPage:(v:number)=>void; filtered:Licitacion[]; onDetail:(v:Licitacion)=>void }) {
  const entities = ['Todas', ...Array.from(new Set(licitaciones.map((item) => item.entidad)))];
  const pageSize = 25;
  const pageCount = Math.ceil(props.filtered.length / pageSize);
  const currentPage = Math.min(props.page, Math.max(pageCount - 1, 0));
  const firstVisible = currentPage * pageSize;
  const visible = props.filtered.slice(firstVisible, firstVisible + pageSize);
  const lastVisible = Math.min(firstVisible + pageSize, props.filtered.length);
  const activeProcesses = licitaciones.filter((item) => item.estado === 'En trabajo' || item.estado === 'Construcción').length;
  const datedDecisions = hitos.length;
  const hasFilters = props.query.length > 0 || props.stateFilter !== 'Todos' || props.entityFilter !== 'Todas';
  const clearFilters = () => { props.setQuery(''); props.setStateFilter('Todos'); props.setEntityFilter('Todas'); };
  return <section className="list-view">
    <div className="directory-heading"><div><p className="section-kicker">CONTROL DE LICITACIONES</p><h2>Directorio de procesos</h2><p>Encuentra un expediente y revisa su situación operativa en un solo lugar.</p></div><section className="directory-stats" aria-label="Resumen del directorio"><div><span>Procesos del corte</span><strong>{fuentes.totalProcesosUnicos}</strong></div><div><span>En ejecución</span><strong>{activeProcesses}</strong></div><div className="risk"><span>Fallos con fecha</span><strong>{datedDecisions}</strong></div></section></div>
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

function DetailView({ item, onBack }: { item:Licitacion; onBack:()=>void }) {
  const tareas = item.tareas ?? [];
  const average = tareas.length ? Math.round(tareas.reduce((sum,task) => sum + task.avance,0) / tareas.length) : 0;
  const completed = tareas.filter((task) => task.avance === 100).length;
  const owners = Array.from(new Set(tareas.map((task) => task.responsable)));
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

    <div className="milestone-strip" aria-label="Fechas clave del proceso">
      {milestoneDates.map((date, index) => <div className="milestone" key={date.label}>
        <span className="milestone-index">{index + 1}</span><div><span>{date.label}</span><strong>{date.value}</strong></div>
      </div>)}
    </div>

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
};

function matchChatQuestion(value: string): ChatKey | null {
  const normalized = value.toLocaleLowerCase('es-MX');
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
      {messages.length > 0 && <div className="quick-prompts">{(Object.keys(chatAnswers) as ChatKey[]).filter((key) => !messages.some((message) => message.key === key)).slice(0, 2).map((key) => <button key={key} onClick={() => ask(key)}>{questionMeta[key].label}</button>)}</div>}
      <form className="chat-composer" onSubmit={submit}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ej. fallos próximos, oferta, avance…" aria-label="Buscar en las consultas guiadas" /><button type="submit" disabled={!draft.trim()} aria-label="Buscar consulta"><Search /></button></form>
      <div className="chat-context"><Database /><span>Contenido precargado · corte {fuentes.corte}</span></div>
    </div>
  </SheetContent></Sheet>;
}
