'use client';

import { useMemo } from 'react';
import {
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileCheck2,
  FileText,
  Link2,
  ShieldAlert,
  Target,
  Users,
  WalletCards,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  bonds,
  cobranzaConsolidada,
  diasParaVencer,
  matchResultPorProyecto,
  montoTotal,
  proyectos,
  semaforoDesfase,
  totalFacturado,
  totalPagado,
  weeklyGoals,
  type BondStatus,
  type SemaforoDesfase,
} from '@/lib/mock-data-finanzas-obra';
import { fmtMXN, licitacionPorId } from '@/lib/mock-data-helpers';

const semaforoLabel: Record<SemaforoDesfase, string> = {
  alineado: 'Alineado',
  amarillo: 'Desfase moderado',
  rojo: 'Desfase alto',
};

const semaforoDescription: Record<SemaforoDesfase, string> = {
  alineado: 'El avance físico y la facturación siguen un ritmo similar.',
  amarillo: 'Revisar la siguiente estimación y la evidencia de avance.',
  rojo: 'La diferencia amerita una revisión financiera y operativa.',
};

const bondStatusLabel: Record<BondStatus, string> = {
  vigente: 'Vigente',
  por_vencer: 'Por vencer',
  vencida: 'Vencida',
  liberada: 'Liberada',
};

function avanceGantt(licitacionId: string | null | undefined): number | null {
  if (!licitacionId) return null;
  const licitacion = licitacionPorId(licitacionId);
  if (!licitacion?.tareas?.length) return null;
  return Math.round((licitacion.tareas.reduce((sum, tarea) => sum + tarea.avance, 0) / licitacion.tareas.length) * 10) / 10;
}

function formatPercent(value: number): string {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function boundedPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function ProgressLine({ value, tone }: { value: number; tone: 'physical' | 'billing' | 'gantt' }) {
  return <div className={`obra-track obra-track-${tone}`} aria-hidden="true">
    <i style={{ width: `${boundedPercent(value)}%` }} />
  </div>;
}

export function ObraView() {
  const filas = useMemo(() => proyectos.map((proyecto) => {
    const match = matchResultPorProyecto(proyecto.id);
    const licitacion = match?.licitacionId ? licitacionPorId(match.licitacionId) : undefined;
    const total = montoTotal(proyecto.id);
    const facturado = totalFacturado(proyecto.id);
    const pagado = totalPagado(proyecto.id);
    const gantt = avanceGantt(match?.licitacionId);
    const { desfase, nivel } = semaforoDesfase(proyecto.id);
    const fianza = bonds.find((bond) => bond.proyectoId === proyecto.id);
    const tareasAbiertas = licitacion?.tareas?.filter((tarea) => tarea.avance < 100) ?? [];

    return {
      proyecto,
      match,
      licitacion,
      total,
      facturado,
      facturadoPct: total > 0 ? Math.round((facturado / total) * 1000) / 10 : 0,
      pagado,
      gantt,
      desfase,
      nivel,
      fianza,
      tareasAbiertas,
    };
  }), []);

  const cobranza = useMemo(() => cobranzaConsolidada(), []);
  const alertas = filas.filter((fila) => fila.nivel !== 'alineado');
  const promedioFisico = filas.length
    ? Math.round((filas.reduce((sum, fila) => sum + fila.proyecto.progress, 0) / filas.length) * 10) / 10
    : 0;
  const avancePonderado = cobranza.montoTotal > 0
    ? Math.round((filas.reduce((sum, fila) => sum + fila.proyecto.progress * fila.total, 0) / cobranza.montoTotal) * 10) / 10
    : 0;
  const tareasAbiertas = filas
    .flatMap((fila) => fila.tareasAbiertas.map((tarea) => ({ ...tarea, proyecto: fila.proyecto.name })))
    .sort((a, b) => a.avance - b.avance)
    .slice(0, 4);
  const fianzasOrdenadas = [...bonds].sort((a, b) => {
    const priority = (status: BondStatus) => status === 'vencida' ? 0 : status === 'por_vencer' ? 1 : status === 'vigente' ? 2 : 3;
    return priority(a.status) - priority(b.status) || diasParaVencer(a) - diasParaVencer(b);
  });

  return <div className="concept-view obra-view">
    <header className="concept-page-heading obra-page-heading">
      <div>
        <p className="section-kicker">CENTRO DE CONTROL DE OBRA</p>
        <h2>Obra y ejecución contractual</h2>
        <p>Compara avance físico, facturación y Gantt para detectar qué proyecto necesita atención.</p>
      </div>
    </header>

    <section className="obra-summary-grid" aria-label="Resumen del portafolio de obra">
      <div className="obra-summary-card obra-summary-primary">
        <span>Proyectos activos</span>
        <strong>{proyectos.length}</strong>
        <small>{alertas.length} con desfase que requieren revisión</small>
      </div>
      <div className="obra-summary-card">
        <span>Avance físico promedio</span>
        <strong>{formatPercent(promedioFisico)}</strong>
        <small>{formatPercent(avancePonderado)} ponderado por monto contratado</small>
      </div>
      <div className="obra-summary-card">
        <span>Monto contratado</span>
        <strong>{fmtMXN(cobranza.montoTotal)}</strong>
        <small>{fmtMXN(cobranza.porEjercer)} por ejercer</small>
      </div>
      <div className="obra-summary-card">
        <span>Facturado / pagado</span>
        <strong>{fmtMXN(cobranza.facturado)}</strong>
        <small>{fmtMXN(cobranza.pagado)} pagado · {fmtMXN(cobranza.pendientePorCobrar)} por cobrar</small>
      </div>
    </section>

    <Card className="executive-card obra-portfolio-card">
      <CardHeader>
        <div>
          <CardTitle>Portafolio de proyectos</CardTitle>
          <p>El cruce muestra el ritmo de la obra frente a lo facturado y al Gantt administrativo.</p>
        </div>
        <span className="obra-count-badge"><ClipboardList /> {filas.length} expedientes</span>
      </CardHeader>
      <CardContent className="obra-project-list">
        {filas.map((fila) => <article className={`obra-project-row obra-project-${fila.nivel}`} key={fila.proyecto.id}>
          <div className="obra-project-heading">
            <div className="obra-project-copy">
              <div className="obra-status-line"><span className={`obra-status-dot obra-status-${fila.nivel}`} />{semaforoLabel[fila.nivel]}</div>
              <h3>{fila.proyecto.name}</h3>
              <div className="obra-project-meta">
                <span><Building2 /> {fila.proyecto.client}</span>
                <span><Users /> {fila.proyecto.coordinator}</span>
                <span><Link2 /> {fila.match?.autoLinked ? `Cruce automático ${Math.round((fila.match.score ?? 0) * 100)}%` : 'Cruce pendiente'}</span>
              </div>
            </div>
            <div className={`obra-delta obra-delta-${fila.nivel}`}>
              <strong>{formatPercent(fila.desfase)}</strong>
              <span>de diferencia</span>
            </div>
          </div>

          <div className="obra-measures">
            <div className="obra-measure">
              <div><span>Avance físico</span><strong>{formatPercent(fila.proyecto.progress)}</strong></div>
              <ProgressLine value={fila.proyecto.progress} tone="physical" />
              <small>Reporte de obra</small>
            </div>
            <div className="obra-measure">
              <div><span>Facturado</span><strong>{formatPercent(fila.facturadoPct)}</strong></div>
              <ProgressLine value={fila.facturadoPct} tone="billing" />
              <small>{fmtMXN(fila.facturado)} de {fmtMXN(fila.total)}</small>
            </div>
            <div className="obra-measure">
              <div><span>Gantt administrativo</span><strong>{fila.gantt === null ? 'Sin dato' : formatPercent(fila.gantt)}</strong></div>
              {fila.gantt === null ? <div className="obra-track obra-track-empty" /> : <ProgressLine value={fila.gantt} tone="gantt" />}
              <small>{fila.licitacion ? `${fila.tareasAbiertas.length} tareas abiertas` : 'Sin expediente vinculado'}</small>
            </div>
          </div>

          <div className="obra-project-footer">
            <span><WalletCards /> {fmtMXN(fila.total)} contrato total</span>
            <span><Banknote /> {fmtMXN(fila.pagado)} pagado</span>
            <span><CalendarDays /> {fila.proyecto.contractStart} al {fila.proyecto.contractEnd}</span>
            <span className="obra-project-note">{semaforoDescription[fila.nivel]}</span>
          </div>
        </article>)}
      </CardContent>
    </Card>

    <div className="obra-bottom-grid">
      <div className="obra-bottom-column">
      <Card className="executive-card obra-goals-card">
        <CardHeader>
          <div>
            <CardTitle>Objetivos semanales</CardTitle>
            <p>Compromisos operativos registrados para el corte.</p>
          </div>
          <Target className="obra-card-icon" />
        </CardHeader>
        <CardContent className="obra-goal-list">
          {weeklyGoals.map((goal) => {
            const proyecto = proyectos.find((item) => item.id === goal.proyectoId);
            return <article className="obra-goal-row" key={goal.id}>
              <div className="obra-goal-date"><strong>{goal.weekStart.slice(0, 2)}</strong><span>{goal.weekStart.slice(3, 6).toUpperCase()}</span></div>
              <div className="obra-goal-copy">
                <strong>{proyecto?.name}</strong>
                <span>{goal.objetivo}</span>
                <ProgressLine value={goal.completadoPct} tone="physical" />
              </div>
              <b>{formatPercent(goal.completadoPct)}</b>
            </article>;
          })}
          {!weeklyGoals.length && <div className="obra-empty-state"><Target /><span>No hay objetivos registrados para este corte.</span></div>}
        </CardContent>
      </Card>

      <Card className="executive-card obra-source-card">
        <CardHeader>
          <div>
            <CardTitle>Calidad del cruce</CardTitle>
            <p>Qué tan completa es la relación entre la obra y el expediente de licitación.</p>
          </div>
          <FileCheck2 className="obra-card-icon" />
        </CardHeader>
        <CardContent>
          <div className="obra-source-stats">
            <div><strong>{filas.filter((fila) => fila.match?.autoLinked).length}/{filas.length}</strong><span>proyectos vinculados</span></div>
            <div><strong>{filas.filter((fila) => fila.gantt !== null).length}/{filas.length}</strong><span>con Gantt disponible</span></div>
            <div><strong>{filas.filter((fila) => fila.fianza).length}/{filas.length}</strong><span>con fianza registrada</span></div>
          </div>
          <div className="obra-source-note"><FileText /><span>El cruce automático usa número de procedimiento, nombre, dependencia y fechas. La confianza se muestra en cada proyecto para hacer visible el origen del dato.</span></div>
        </CardContent>
      </Card>
      </div>

      <div className="obra-bottom-column">
      <Card className="executive-card obra-bonds-card">
        <CardHeader>
          <div>
            <CardTitle>Fianzas y fechas críticas</CardTitle>
            <p>Vencimientos contractuales asociados a cada proyecto.</p>
          </div>
          <ShieldAlert className="obra-card-icon" />
        </CardHeader>
        <CardContent className="obra-bond-list">
          {fianzasOrdenadas.map((bond) => {
            const proyecto = proyectos.find((item) => item.id === bond.proyectoId);
            const dias = diasParaVencer(bond);
            return <article className={`obra-bond-row obra-bond-${bond.status}`} key={bond.id}>
              <div className="obra-bond-icon"><ShieldAlert /></div>
              <div className="obra-bond-copy">
                <strong>{proyecto?.name}</strong>
                <span>{bond.insurer} · {bond.policyNumber}</span>
              </div>
              <div className="obra-bond-date"><strong>{bond.expiryDate}</strong><span>{bond.status === 'por_vencer' || bond.status === 'vencida' ? `${Math.abs(dias)} días ${dias < 0 ? 'vencida' : 'restantes'}` : bondStatusLabel[bond.status]}</span></div>
            </article>;
          })}
        </CardContent>
      </Card>
      <Card className="executive-card obra-tasks-card">
        <CardHeader>
          <div>
            <CardTitle>Gantt: pendientes de menor avance</CardTitle>
            <p>Primeras tareas abiertas para priorizar seguimiento operativo.</p>
          </div>
          <Clock3 className="obra-card-icon" />
        </CardHeader>
        <CardContent className="obra-task-list">
          {tareasAbiertas.map((tarea) => <div className="obra-task-row" key={`${tarea.proyecto}-${tarea.nombre}`}>
            <div><strong>{tarea.nombre}</strong><span>{tarea.proyecto} · {tarea.responsable}</span></div>
            <b>{formatPercent(tarea.avance)}</b>
          </div>)}
          {!tareasAbiertas.length && <div className="obra-empty-state"><CheckCircle2 /><span>No hay tareas abiertas en los Gantt vinculados.</span></div>}
        </CardContent>
      </Card>
      </div>
    </div>
  </div>;
}
