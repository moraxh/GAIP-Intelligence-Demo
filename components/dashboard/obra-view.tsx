'use client';

import { useMemo, useState } from 'react';
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
  Pencil,
  Plus,
  RotateCcw,
  ShieldAlert,
  Target,
  Trash2,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  cobranzaConsolidada,
  diasParaVencer,
  matchResultPorProyecto,
  montoTotal,
  semaforoDesfase,
  totalFacturado,
  totalPagado,
  type BondIlustrativo,
  type BondStatus,
  type BondType,
  type SemaforoDesfase,
  type WeeklyGoalIlustrativo,
} from '@/lib/mock-data-finanzas-obra';
import { fmtMXN, licitacionPorId } from '@/lib/mock-data-helpers';
import { usePortfolio } from '@/lib/portfolio-store';

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

const bondTypeLabel: Record<BondType, string> = {
  cumplimiento: 'Cumplimiento',
  anticipo: 'Anticipo',
  vicios_ocultos: 'Vicios ocultos',
  otro: 'Otro',
};
const bondStatusOptions: BondStatus[] = ['vigente', 'por_vencer', 'vencida', 'liberada'];

type EditingId = { kind: 'new' } | { kind: 'existing'; id: string } | null;
type BondDraft = { proyectoId: string; type: BondType; insurer: string; policyNumber: string; expiryDate: string; status: BondStatus };
type GoalDraft = { proyectoId: string; weekStart: string; objetivo: string; completadoPct: string };

function bondToDraft(bond: BondIlustrativo): BondDraft {
  return { proyectoId: bond.proyectoId, type: bond.type, insurer: bond.insurer, policyNumber: bond.policyNumber, expiryDate: bond.expiryDate, status: bond.status };
}
function goalToDraft(goal: WeeklyGoalIlustrativo): GoalDraft {
  return { proyectoId: goal.proyectoId, weekStart: goal.weekStart, objetivo: goal.objetivo, completadoPct: String(goal.completadoPct) };
}

function ProgressLine({ value, tone }: { value: number; tone: 'physical' | 'billing' | 'gantt' }) {
  return <div className={`obra-track obra-track-${tone}`} aria-hidden="true">
    <i style={{ width: `${boundedPercent(value)}%` }} />
  </div>;
}

export function ObraView() {
  const portfolio = usePortfolio();
  const { proyectos, bonds, weeklyGoals } = portfolio;

  const filas = useMemo(() => proyectos.map((proyecto) => {
    const match = matchResultPorProyecto(proyecto.id);
    const licitacion = match?.licitacionId ? licitacionPorId(match.licitacionId) : undefined;
    const total = montoTotal(proyecto.id, portfolio.addendas, proyectos);
    const facturado = totalFacturado(proyecto.id, portfolio.invoices);
    const pagado = totalPagado(proyecto.id, portfolio.payments);
    const gantt = avanceGantt(match?.licitacionId);
    const { desfase, nivel } = semaforoDesfase(proyecto.id, portfolio.invoices, portfolio.addendas, proyectos);
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
  }), [proyectos, bonds, portfolio.addendas, portfolio.invoices, portfolio.payments]);

  const cobranza = useMemo(
    () => cobranzaConsolidada(portfolio.proyectos, portfolio.invoices, portfolio.payments, portfolio.addendas),
    [portfolio.proyectos, portfolio.invoices, portfolio.payments, portfolio.addendas],
  );
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

  const emptyBondDraft: BondDraft = { proyectoId: proyectos[0]?.id ?? '', type: 'cumplimiento', insurer: '', policyNumber: '', expiryDate: '', status: 'vigente' };
  const emptyGoalDraft: GoalDraft = { proyectoId: proyectos[0]?.id ?? '', weekStart: '', objetivo: '', completadoPct: '0' };
  const [bondEditingId, setBondEditingId] = useState<EditingId>(null);
  const [bondDraft, setBondDraft] = useState<BondDraft>(emptyBondDraft);
  const [goalEditingId, setGoalEditingId] = useState<EditingId>(null);
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(emptyGoalDraft);

  const startNewBond = () => { setBondDraft(emptyBondDraft); setBondEditingId({ kind: 'new' }); };
  const startEditBond = (bond: BondIlustrativo) => { setBondDraft(bondToDraft(bond)); setBondEditingId({ kind: 'existing', id: bond.id }); };
  const cancelBondEdit = () => setBondEditingId(null);
  const saveBond = () => {
    if (!bondDraft.proyectoId || !bondDraft.insurer || !bondDraft.policyNumber || !bondDraft.expiryDate) return;
    const payload = { ...bondDraft };
    if (bondEditingId?.kind === 'new') portfolio.addBond(payload);
    else if (bondEditingId?.kind === 'existing') portfolio.updateBond(bondEditingId.id, payload);
    setBondEditingId(null);
  };

  const startNewGoal = () => { setGoalDraft(emptyGoalDraft); setGoalEditingId({ kind: 'new' }); };
  const startEditGoal = (goal: WeeklyGoalIlustrativo) => { setGoalDraft(goalToDraft(goal)); setGoalEditingId({ kind: 'existing', id: goal.id }); };
  const cancelGoalEdit = () => setGoalEditingId(null);
  const saveGoal = () => {
    const completadoPct = Number(goalDraft.completadoPct);
    if (!goalDraft.proyectoId || !goalDraft.weekStart || !goalDraft.objetivo || !Number.isFinite(completadoPct)) return;
    const payload = { proyectoId: goalDraft.proyectoId, weekStart: goalDraft.weekStart, objetivo: goalDraft.objetivo, completadoPct: Math.max(0, Math.min(100, completadoPct)) };
    if (goalEditingId?.kind === 'new') portfolio.addWeeklyGoal(payload);
    else if (goalEditingId?.kind === 'existing') portfolio.updateWeeklyGoal(goalEditingId.id, payload);
    setGoalEditingId(null);
  };

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
          <Button variant="outline" size="sm" onClick={startNewGoal}><Plus />Agregar</Button>
        </CardHeader>
        <CardContent className="obra-goal-list">
          {goalEditingId?.kind === 'new' && <GoalForm draft={goalDraft} setDraft={setGoalDraft} proyectos={proyectos} onSave={saveGoal} onCancel={cancelGoalEdit} />}
          {weeklyGoals.map((goal) => {
            const proyecto = proyectos.find((item) => item.id === goal.proyectoId);
            if (goalEditingId?.kind === 'existing' && goalEditingId.id === goal.id) {
              return <GoalForm key={goal.id} draft={goalDraft} setDraft={setGoalDraft} proyectos={proyectos} onSave={saveGoal} onCancel={cancelGoalEdit} />;
            }
            return <article className="obra-goal-row" key={goal.id}>
              <div className="obra-goal-date"><strong>{goal.weekStart.slice(0, 2)}</strong><span>{goal.weekStart.slice(3, 6).toUpperCase()}</span></div>
              <div className="obra-goal-copy">
                <strong>{proyecto?.name}</strong>
                <span>{goal.objetivo}</span>
                <ProgressLine value={goal.completadoPct} tone="physical" />
              </div>
              <b>{formatPercent(goal.completadoPct)}</b>
              <div className="obra-row-actions">
                <button type="button" aria-label={`Editar objetivo ${goal.objetivo}`} onClick={() => startEditGoal(goal)}><Pencil /></button>
                <button type="button" aria-label={`Eliminar objetivo ${goal.objetivo}`} onClick={() => portfolio.removeWeeklyGoal(goal.id)}><Trash2 /></button>
              </div>
            </article>;
          })}
          {!weeklyGoals.length && goalEditingId?.kind !== 'new' && <div className="obra-empty-state"><Target /><span>No hay objetivos registrados para este corte.</span></div>}
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
          <div className="obra-crud-actions">
            {portfolio.isDirty && <Button variant="ghost" size="sm" onClick={portfolio.resetToBase} aria-label="Restablecer datos ilustrativos originales"><RotateCcw />Restablecer</Button>}
            <Button variant="outline" size="sm" onClick={startNewBond}><Plus />Agregar</Button>
          </div>
        </CardHeader>
        <CardContent className="obra-bond-list">
          {bondEditingId?.kind === 'new' && <BondForm draft={bondDraft} setDraft={setBondDraft} proyectos={proyectos} onSave={saveBond} onCancel={cancelBondEdit} />}
          {fianzasOrdenadas.map((bond) => {
            const proyecto = proyectos.find((item) => item.id === bond.proyectoId);
            const dias = diasParaVencer(bond);
            if (bondEditingId?.kind === 'existing' && bondEditingId.id === bond.id) {
              return <BondForm key={bond.id} draft={bondDraft} setDraft={setBondDraft} proyectos={proyectos} onSave={saveBond} onCancel={cancelBondEdit} />;
            }
            return <article className={`obra-bond-row obra-bond-${bond.status}`} key={bond.id}>
              <div className="obra-bond-icon"><ShieldAlert /></div>
              <div className="obra-bond-copy">
                <strong>{proyecto?.name}</strong>
                <span>{bond.insurer} · {bond.policyNumber}</span>
              </div>
              <div className="obra-bond-date"><strong>{bond.expiryDate}</strong><span>{bond.status === 'por_vencer' || bond.status === 'vencida' ? `${Math.abs(dias)} días ${dias < 0 ? 'vencida' : 'restantes'}` : bondStatusLabel[bond.status]}</span></div>
              <div className="obra-row-actions">
                <button type="button" aria-label={`Editar fianza de ${proyecto?.name}`} onClick={() => startEditBond(bond)}><Pencil /></button>
                <button type="button" aria-label={`Eliminar fianza de ${proyecto?.name}`} onClick={() => portfolio.removeBond(bond.id)}><Trash2 /></button>
              </div>
            </article>;
          })}
          {!fianzasOrdenadas.length && bondEditingId?.kind !== 'new' && <div className="obra-empty-state"><ShieldAlert /><span>No hay fianzas registradas.</span></div>}
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
    <p className="finance-crud-note"><ShieldAlert aria-hidden="true" />Agregar, editar o eliminar fianzas u objetivos aquí actualiza el ranking de riesgo y el resumen ejecutivo en vivo — pero solo en esta sesión del navegador, no queda guardado en ningún sistema.</p>
  </div>;
}

function BondForm({ draft, setDraft, proyectos, onSave, onCancel }: {
  draft: BondDraft; setDraft: (d: BondDraft) => void; proyectos: { id: string; name: string }[]; onSave: () => void; onCancel: () => void;
}) {
  return <form className="finance-crud-form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
    <div className="finance-crud-field">
      <label htmlFor="bond-proyecto">Proyecto</label>
      <Select value={draft.proyectoId} onValueChange={(value) => setDraft({ ...draft, proyectoId: value as string })}>
        <SelectTrigger id="bond-proyecto"><SelectValue /></SelectTrigger>
        <SelectContent className="select-content-wide">{proyectos.map((p) => <SelectItem value={p.id} key={p.id}>{p.name}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div className="finance-crud-field">
      <label htmlFor="bond-type">Tipo</label>
      <Select value={draft.type} onValueChange={(value) => setDraft({ ...draft, type: value as BondType })}>
        <SelectTrigger id="bond-type"><SelectValue /></SelectTrigger>
        <SelectContent>{(Object.keys(bondTypeLabel) as BondType[]).map((t) => <SelectItem value={t} key={t}>{bondTypeLabel[t]}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div className="finance-crud-field"><label htmlFor="bond-insurer">Aseguradora</label><Input id="bond-insurer" value={draft.insurer} onChange={(e) => setDraft({ ...draft, insurer: e.target.value })} placeholder="Fianzas Guardiana" /></div>
    <div className="finance-crud-field"><label htmlFor="bond-policy">Póliza</label><Input id="bond-policy" value={draft.policyNumber} onChange={(e) => setDraft({ ...draft, policyNumber: e.target.value })} placeholder="FG-2026-0000" /></div>
    <div className="finance-crud-field"><label htmlFor="bond-expiry">Vence</label><Input id="bond-expiry" value={draft.expiryDate} onChange={(e) => setDraft({ ...draft, expiryDate: e.target.value })} placeholder="10 sep 2026" /></div>
    <div className="finance-crud-field">
      <label htmlFor="bond-status">Estatus</label>
      <Select value={draft.status} onValueChange={(value) => setDraft({ ...draft, status: value as BondStatus })}>
        <SelectTrigger id="bond-status"><SelectValue /></SelectTrigger>
        <SelectContent>{bondStatusOptions.map((s) => <SelectItem value={s} key={s}>{bondStatusLabel[s]}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div className="finance-crud-form-actions">
      <Button type="submit" size="sm">Guardar</Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}><X />Cancelar</Button>
    </div>
  </form>;
}

function GoalForm({ draft, setDraft, proyectos, onSave, onCancel }: {
  draft: GoalDraft; setDraft: (d: GoalDraft) => void; proyectos: { id: string; name: string }[]; onSave: () => void; onCancel: () => void;
}) {
  return <form className="finance-crud-form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
    <div className="finance-crud-field">
      <label htmlFor="goal-proyecto">Proyecto</label>
      <Select value={draft.proyectoId} onValueChange={(value) => setDraft({ ...draft, proyectoId: value as string })}>
        <SelectTrigger id="goal-proyecto"><SelectValue /></SelectTrigger>
        <SelectContent className="select-content-wide">{proyectos.map((p) => <SelectItem value={p.id} key={p.id}>{p.name}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div className="finance-crud-field"><label htmlFor="goal-week">Semana</label><Input id="goal-week" value={draft.weekStart} onChange={(e) => setDraft({ ...draft, weekStart: e.target.value })} placeholder="15 sep 2026" /></div>
    <div className="finance-crud-field"><label htmlFor="goal-objetivo">Objetivo</label><Input id="goal-objetivo" value={draft.objetivo} onChange={(e) => setDraft({ ...draft, objetivo: e.target.value })} placeholder="Colado de losa" /></div>
    <div className="finance-crud-field"><label htmlFor="goal-pct">Completado %</label><Input id="goal-pct" type="number" min="0" max="100" value={draft.completadoPct} onChange={(e) => setDraft({ ...draft, completadoPct: e.target.value })} /></div>
    <div className="finance-crud-form-actions">
      <Button type="submit" size="sm">Guardar</Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}><X />Cancelar</Button>
    </div>
  </form>;
}
