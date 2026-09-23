'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowUpRight, CalendarClock, CheckCircle2, Pencil, Plus, RotateCcw, Trash2,
  CircleDollarSign, Clock3, FlaskConical, ShieldAlert, TrendingUp, WalletCards, X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  bondsPorVencerDe, cobranzaConsolidada, diasEntreFallo, diasParaVencer,
  proyectoPorId, riesgoPortafolio, totalFacturado, totalPagado,
  montoTotal, matchResultPorProyecto, type BondStatus, type RiesgoNivel, type InvoiceStatus, type InvoiceIlustrativa, type PaymentIlustrativo,
  type ProjectStatus, type ProyectoIlustrativo,
} from '@/lib/mock-data-finanzas-obra';
import { fmtMXN as fmt, licitacionPorId } from '@/lib/mock-data-helpers';
import { usePortfolio } from '@/lib/portfolio-store';

const bondStatusLabel: Record<BondStatus, string> = {
  vigente: 'Vigente',
  por_vencer: 'Por vencer',
  vencida: 'Vencida',
  liberada: 'Liberada',
};

const riskLabel: Record<RiesgoNivel, string> = {
  alto: 'Alto',
  medio: 'Medio',
  bajo: 'Controlado',
};

const invoiceStatusLabel = {
  pendiente: 'Estimación',
  facturado: 'Facturada',
  pagado: 'Pagada',
} as const;

const projectStatusLabel: Record<ProjectStatus, string> = {
  activo: 'Activo',
  en_pausa: 'En pausa',
  en_riesgo: 'En riesgo',
  terminado: 'Terminado',
  cancelado: 'Cancelado',
};

function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

type EditingId = { kind: 'new' } | { kind: 'existing'; id: string } | null;
type InvoiceDraft = { proyectoId: string; folio: string; amount: string; status: InvoiceStatus; issueDate: string };
type PaymentDraft = { proyectoId: string; amount: string; paymentDate: string };

function invoiceToDraft(inv: InvoiceIlustrativa): InvoiceDraft {
  return { proyectoId: inv.proyectoId, folio: inv.folio, amount: String(inv.amount), status: inv.status, issueDate: inv.issueDate };
}
function paymentToDraft(p: PaymentIlustrativo): PaymentDraft {
  return { proyectoId: p.proyectoId, amount: String(p.amount), paymentDate: p.paymentDate };
}

type ProyectoDraft = {
  name: string; client: string; status: ProjectStatus; progress: string; coordinator: string;
  contractAmount: string; contractStart: string; contractEnd: string;
};
function proyectoToDraft(p: ProyectoIlustrativo): ProyectoDraft {
  return {
    name: p.name, client: p.client, status: p.status, progress: String(p.progress), coordinator: p.coordinator,
    contractAmount: String(p.contractAmount), contractStart: p.contractStart, contractEnd: p.contractEnd,
  };
}

export function FinanzasView() {
  const portfolio = usePortfolio();
  const { proyectos, invoices, payments, addendas } = portfolio;
  const [portfolioFilter, setPortfolioFilter] = useState<'todos' | 'atencion'>('todos');
  const bondsPorVencer = useMemo(() => bondsPorVencerDe(portfolio.bonds), [portfolio.bonds]);
  const c = useMemo(() => cobranzaConsolidada(proyectos, invoices, payments, addendas), [proyectos, invoices, payments, addendas]);
  const risks = useMemo(() => riesgoPortafolio(proyectos, invoices, portfolio.bonds, addendas), [proyectos, invoices, portfolio.bonds, addendas]);

  const projectRows = useMemo(() => proyectos.map((proyecto) => {
    const total = montoTotal(proyecto.id, addendas, proyectos);
    const facturado = totalFacturado(proyecto.id, invoices);
    const pagado = totalPagado(proyecto.id, payments);
    const pctFacturado = percentage(facturado, total);
    const balance = proyecto.progress - pctFacturado;
    const risk = risks.find((item) => item.proyecto.id === proyecto.id);
    const bond = bondsPorVencer.find((item) => item.proyectoId === proyecto.id);
    return {
      proyecto,
      total,
      facturado,
      pagado,
      pendiente: facturado - pagado,
      porEjercer: total - facturado,
      pctFacturado,
      balance,
      delta: Math.abs(balance),
      risk,
      bond,
      needsAttention: risk?.nivel === 'alto' || Boolean(bond) || Math.abs(balance) > 10,
    };
  }), [proyectos, invoices, payments, addendas, risks, bondsPorVencer]);

  const rowsToShow = portfolioFilter === 'atencion'
    ? projectRows.filter((row) => row.needsAttention)
    : projectRows;

  const facturadoPct = percentage(c.facturado, c.montoTotal);
  const pagadoDeFacturadoPct = percentage(c.pagado, c.facturado);
  const pendingProjects = projectRows.filter((row) => row.pendiente > 0).length;
  const attentionCount = projectRows.filter((row) => row.needsAttention).length;

  const emptyInvoiceDraft: InvoiceDraft = { proyectoId: proyectos[0]?.id ?? '', folio: '', amount: '', status: 'pendiente', issueDate: '' };
  const emptyPaymentDraft: PaymentDraft = { proyectoId: proyectos[0]?.id ?? '', amount: '', paymentDate: '' };
  const [invoiceEditingId, setInvoiceEditingId] = useState<EditingId>(null);
  const [invoiceDraft, setInvoiceDraft] = useState<InvoiceDraft>(emptyInvoiceDraft);
  const [paymentEditingId, setPaymentEditingId] = useState<EditingId>(null);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>(emptyPaymentDraft);

  const startNewInvoice = () => { setInvoiceDraft(emptyInvoiceDraft); setInvoiceEditingId({ kind: 'new' }); };
  const startEditInvoice = (inv: InvoiceIlustrativa) => { setInvoiceDraft(invoiceToDraft(inv)); setInvoiceEditingId({ kind: 'existing', id: inv.id }); };
  const cancelInvoiceEdit = () => setInvoiceEditingId(null);
  const saveInvoice = () => {
    const amount = Number(invoiceDraft.amount);
    if (!invoiceDraft.proyectoId || !invoiceDraft.folio || !invoiceDraft.issueDate || !Number.isFinite(amount) || amount <= 0) return;
    const payload = { proyectoId: invoiceDraft.proyectoId, folio: invoiceDraft.folio, amount, status: invoiceDraft.status, issueDate: invoiceDraft.issueDate };
    if (invoiceEditingId?.kind === 'new') portfolio.addInvoice(payload);
    else if (invoiceEditingId?.kind === 'existing') portfolio.updateInvoice(invoiceEditingId.id, payload);
    setInvoiceEditingId(null);
  };

  const startNewPayment = () => { setPaymentDraft(emptyPaymentDraft); setPaymentEditingId({ kind: 'new' }); };
  const startEditPayment = (p: PaymentIlustrativo) => { setPaymentDraft(paymentToDraft(p)); setPaymentEditingId({ kind: 'existing', id: p.id }); };
  const cancelPaymentEdit = () => setPaymentEditingId(null);
  const savePayment = () => {
    const amount = Number(paymentDraft.amount);
    if (!paymentDraft.proyectoId || !paymentDraft.paymentDate || !Number.isFinite(amount) || amount <= 0) return;
    const payload = { proyectoId: paymentDraft.proyectoId, amount, paymentDate: paymentDraft.paymentDate };
    if (paymentEditingId?.kind === 'new') portfolio.addPayment(payload);
    else if (paymentEditingId?.kind === 'existing') portfolio.updatePayment(paymentEditingId.id, payload);
    setPaymentEditingId(null);
  };

  const emptyProyectoDraft: ProyectoDraft = { name: '', client: '', status: 'activo', progress: '0', coordinator: 'Sin asignar', contractAmount: '', contractStart: '', contractEnd: '' };
  const [proyectoEditingId, setProyectoEditingId] = useState<EditingId>(null);
  const [proyectoDraft, setProyectoDraft] = useState<ProyectoDraft>(emptyProyectoDraft);

  const startNewProyecto = () => { setProyectoDraft(emptyProyectoDraft); setProyectoEditingId({ kind: 'new' }); };
  const startEditProyecto = (p: ProyectoIlustrativo) => { setProyectoDraft(proyectoToDraft(p)); setProyectoEditingId({ kind: 'existing', id: p.id }); };
  const cancelProyectoEdit = () => setProyectoEditingId(null);
  const saveProyecto = () => {
    const progress = Number(proyectoDraft.progress);
    const contractAmount = Number(proyectoDraft.contractAmount);
    if (!proyectoDraft.name || !proyectoDraft.client || !proyectoDraft.contractStart || !proyectoDraft.contractEnd
      || !Number.isFinite(progress) || !Number.isFinite(contractAmount) || contractAmount <= 0) return;
    const payload = {
      name: proyectoDraft.name, client: proyectoDraft.client, status: proyectoDraft.status,
      progress: Math.max(0, Math.min(100, progress)), coordinator: proyectoDraft.coordinator || 'Sin asignar',
      contractAmount, contractStart: proyectoDraft.contractStart, contractEnd: proyectoDraft.contractEnd,
    };
    if (proyectoEditingId?.kind === 'new') portfolio.addProyecto(payload);
    else if (proyectoEditingId?.kind === 'existing') portfolio.updateProyecto(proyectoEditingId.id, payload);
    setProyectoEditingId(null);
  };
  const removeProyecto = (p: ProyectoIlustrativo) => {
    if (window.confirm(`¿Eliminar "${p.name}"? También se eliminan sus facturas, pagos, fianzas y objetivos asociados.`)) {
      portfolio.removeProyecto(p.id);
    }
  };

  return <div className="concept-view finance-view">
    <div className="concept-page-heading finanzas-page-heading">
      <div>
        <p className="section-kicker">CONTROL FINANCIERO</p>
        <h2>Finanzas del portafolio</h2>
        <p>Una lectura unificada de contratos, facturas, pagos y señales de riesgo.</p>
      </div>
      <div className="finanzas-heading-meta">
        <span className="finanzas-cut"><CalendarClock aria-hidden="true" /> Corte 10 sep 2026 · 08:30</span>
        <span className="concept-badge"><FlaskConical aria-hidden="true" />Datos ilustrativos</span>
      </div>
    </div>

    <section className="finanzas-alert-banner" aria-label="Atención prioritaria">
      <div className="finanzas-alert-icon"><ShieldAlert aria-hidden="true" /></div>
      <div className="finanzas-alert-copy">
        <span className="finanzas-alert-kicker">ATENCIÓN PRIORITARIA</span>
        <strong>{bondsPorVencer.length} fianzas vencen en los próximos 14 días</strong>
        <span>El riesgo aparece al cruzar Finanzas con el fallo registrado en ComprasMX.</span>
      </div>
      <div className="finanzas-alert-summary"><strong>{bondsPorVencer.length}</strong><span>casos abiertos</span></div>
    </section>

    <Card className="executive-card finance-overview-card">
      <CardHeader>
        <div><CardTitle>Cobranza consolidada</CardTitle><p>{proyectos.length} proyectos · importes acumulados al corte</p></div>
        <span className="finance-source-note"><WalletCards aria-hidden="true" /> Contratos + facturación + pagos</span>
      </CardHeader>
      <CardContent>
        <div className="finance-kpi-grid" aria-label="Indicadores financieros">
          <div className="finance-kpi finance-kpi-primary"><span className="finance-kpi-label"><CircleDollarSign aria-hidden="true" /> Contratado</span><strong>{fmt(c.montoTotal)}</strong><small>Base total del portafolio</small></div>
          <div className="finance-kpi"><span className="finance-kpi-label"><ArrowUpRight aria-hidden="true" /> Facturado</span><strong>{fmt(c.facturado)}</strong><small>{facturadoPct}% del contratado</small></div>
          <div className="finance-kpi"><span className="finance-kpi-label"><CheckCircle2 aria-hidden="true" /> Cobrado</span><strong>{fmt(c.pagado)}</strong><small>{pagadoDeFacturadoPct}% de lo facturado</small></div>
          <div className="finance-kpi finance-kpi-warning"><span className="finance-kpi-label"><Clock3 aria-hidden="true" /> Pendiente</span><strong>{fmt(c.pendientePorCobrar)}</strong><small>{pendingProjects} proyectos con saldo por cobrar</small></div>
          <div className="finance-kpi"><span className="finance-kpi-label"><TrendingUp aria-hidden="true" /> Por ejercer</span><strong>{fmt(c.porEjercer)}</strong><small>{100 - facturadoPct}% aún no facturado</small></div>
        </div>

        <div className="finance-progress-panel">
          <div className="finance-progress-heading"><div><strong>Conversión del contrato</strong><span>El tramo azul oscuro muestra lo facturado; dentro, el azul claro muestra lo cobrado.</span></div><strong>{facturadoPct}%</strong></div>
          <progress className="finance-progress-accessible" value={facturadoPct} max={100} aria-label="Porcentaje facturado del contrato" />
          <div className="finance-progress-track" aria-hidden="true">
            <span className="finance-progress-billed" style={{ width: `${facturadoPct}%` }}><i style={{ width: `${pagadoDeFacturadoPct}%` }} /></span>
          </div>
          <div className="finance-progress-legend"><span><i className="legend-billed" /> Facturado {fmt(c.facturado)}</span><span><i className="legend-paid" /> Cobrado {fmt(c.pagado)}</span><span><i className="legend-open" /> Por ejercer {fmt(c.porEjercer)}</span></div>
        </div>
      </CardContent>
    </Card>

    <div className="finanzas-focus-grid">
      <Card className="executive-card finance-panel">
        <CardHeader><div><CardTitle>Fianzas por vencer</CardTitle><p>Ordenadas por cercanía al vencimiento</p></div><Badge className="finance-count-badge" variant="outline">{bondsPorVencer.length} pendientes</Badge></CardHeader>
        <CardContent className="finance-bond-list">
          {bondsPorVencer.map((bond) => {
            const proyecto = proyectoPorId(bond.proyectoId, proyectos);
            const match = matchResultPorProyecto(bond.proyectoId);
            const licitacion = match?.licitacionId ? licitacionPorId(match.licitacionId) : undefined;
            const dias = diasEntreFallo(bond, licitacion?.fallo);
            return <article className="finance-bond-row" key={bond.id}>
              <div className="finance-bond-count"><strong>{diasParaVencer(bond)}</strong><span>días</span></div>
              <div className="finance-bond-copy"><span>{proyecto.client}</span><strong>{proyecto.name}</strong><small>Vence {bond.expiryDate} · {bond.insurer} · Póliza {bond.policyNumber}</small>{dias !== null && <small>Fallo registrado: {licitacion?.fallo} · margen de {dias} días</small>}</div>
              <Badge className={`bond-status-${bond.status}`} variant="outline">{bondStatusLabel[bond.status]}</Badge>
            </article>;
          })}
        </CardContent>
      </Card>

      <Card className="executive-card finance-panel">
        <CardHeader><div><CardTitle>Señales del portafolio</CardTitle><p>Proyectos que merecen revisión financiera u operativa</p></div><Badge className="finance-count-badge" variant="outline">{attentionCount} con atención</Badge></CardHeader>
        <CardContent className="finance-risk-list">
          {risks.slice(0, 3).map((item) => <article className="finance-risk-row" key={item.proyecto.id}>
            <span className={`finance-risk-dot finance-risk-${item.nivel}`} aria-hidden="true" />
            <div><strong>{item.proyecto.name}</strong><span>{item.proyecto.client} · {item.razones[0] ?? 'Sin señales críticas'}</span></div>
            <Badge className={`finance-risk-badge finance-risk-badge-${item.nivel}`} variant="outline">{riskLabel[item.nivel]}</Badge>
          </article>)}
          <div className="finance-risk-footnote"><AlertTriangle aria-hidden="true" /> El ranking combina avance físico, facturación, fianzas y carga del coordinador.</div>
        </CardContent>
      </Card>
    </div>

    <Card className="executive-card finance-portfolio-card">
      <CardHeader>
        <div><CardTitle>Portafolio por proyecto</CardTitle><p>La vista que faltaba para explicar el total consolidado.</p></div>
        <div className="finance-portfolio-header-actions">
          <fieldset className="finance-filter-tabs">
            <legend className="sr-only">Filtrar portafolio</legend>
            <button type="button" className={portfolioFilter === 'todos' ? 'is-active' : ''} aria-pressed={portfolioFilter === 'todos'} onClick={() => setPortfolioFilter('todos')}>Todos <span>{projectRows.length}</span></button>
            <button type="button" className={portfolioFilter === 'atencion' ? 'is-active' : ''} aria-pressed={portfolioFilter === 'atencion'} onClick={() => setPortfolioFilter('atencion')}>Requieren atención <span>{attentionCount}</span></button>
          </fieldset>
          <Button variant="outline" size="sm" onClick={startNewProyecto}><Plus />Agregar proyecto</Button>
        </div>
      </CardHeader>
      <CardContent className="finance-table-content">
        {proyectoEditingId?.kind === 'new' && <ProyectoForm draft={proyectoDraft} setDraft={setProyectoDraft} onSave={saveProyecto} onCancel={cancelProyectoEdit} />}
        <div className="finance-table-scroll">
          <Table className="finanzas-table finanzas-portfolio-table">
            <TableHeader><TableRow><TableHead>Proyecto</TableHead><TableHead>Contrato</TableHead><TableHead>Facturado</TableHead><TableHead>Cobrado</TableHead><TableHead>Pendiente</TableHead><TableHead>Avance físico</TableHead><TableHead>Brecha</TableHead><TableHead>Riesgo</TableHead><TableHead aria-label="Acciones" /></TableRow></TableHeader>
            <TableBody>{rowsToShow.map((row) => proyectoEditingId?.kind === 'existing' && proyectoEditingId.id === row.proyecto.id
              ? <TableRow key={row.proyecto.id}><TableCell colSpan={9}><ProyectoForm draft={proyectoDraft} setDraft={setProyectoDraft} onSave={saveProyecto} onCancel={cancelProyectoEdit} /></TableCell></TableRow>
              : <TableRow key={row.proyecto.id}>
              <TableCell><div className="finance-project-cell"><strong>{row.proyecto.name}</strong><span>{row.proyecto.client} · {row.proyecto.coordinator}</span></div></TableCell>
              <TableCell><strong>{fmt(row.total)}</strong><span className="finance-cell-sub">{row.porEjercer > 0 ? `${fmt(row.porEjercer)} por ejercer` : 'Contrato agotado'}</span></TableCell>
              <TableCell><strong>{fmt(row.facturado)}</strong><span className="finance-cell-sub">{row.pctFacturado}%</span></TableCell>
              <TableCell><strong>{fmt(row.pagado)}</strong><span className="finance-cell-sub">{percentage(row.pagado, row.facturado)}% de facturado</span></TableCell>
              <TableCell><strong className={row.pendiente > 0 ? 'finance-text-warning' : 'finance-text-ok'}>{fmt(row.pendiente)}</strong></TableCell>
              <TableCell><div className="finance-progress-cell"><div className="finance-mini-track"><i style={{ width: `${row.proyecto.progress}%` }} /></div><strong>{row.proyecto.progress}%</strong></div></TableCell>
              <TableCell><span className={`finance-delta finance-delta-${row.delta <= 10 ? 'ok' : row.delta <= 25 ? 'warning' : 'danger'}`}>{row.delta === 0 ? 'Alineado' : `${row.delta.toFixed(1)} pts`}</span><span className="finance-cell-sub">{row.delta === 0 ? 'avance y cobro' : row.balance > 0 ? 'obra adelante' : 'facturación adelante'}</span></TableCell>
              <TableCell><span className={`finance-risk-badge finance-risk-badge-${row.risk?.nivel ?? 'bajo'}`}>{riskLabel[row.risk?.nivel ?? 'bajo']}</span></TableCell>
              <TableCell><div className="finance-row-actions">
                <button type="button" aria-label={`Editar proyecto ${row.proyecto.name}`} onClick={() => startEditProyecto(row.proyecto)}><Pencil /></button>
                <button type="button" aria-label={`Eliminar proyecto ${row.proyecto.name}`} onClick={() => removeProyecto(row.proyecto)}><Trash2 /></button>
              </div></TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <div className="finanzas-transactions-grid">
      <Card className="executive-card finance-panel">
        <CardHeader>
          <div><CardTitle>Facturas emitidas</CardTitle><p>{invoices.length} movimientos · {fmt(c.facturado)} acumulado</p></div>
          <div className="finance-crud-actions">
            {portfolio.isDirty && <Button variant="ghost" size="sm" onClick={portfolio.resetToBase} aria-label="Restablecer datos ilustrativos originales"><RotateCcw />Restablecer</Button>}
            <Button variant="outline" size="sm" onClick={startNewInvoice}><Plus />Agregar factura</Button>
          </div>
        </CardHeader>
        <CardContent className="finance-table-content">
          {invoiceEditingId?.kind === 'new' && <InvoiceForm draft={invoiceDraft} setDraft={setInvoiceDraft} proyectos={proyectos} onSave={saveInvoice} onCancel={cancelInvoiceEdit} />}
          <div className="finance-table-scroll"><Table className="finanzas-table finance-compact-table"><TableHeader><TableRow><TableHead>Proyecto</TableHead><TableHead>Folio</TableHead><TableHead>Monto</TableHead><TableHead>Estado</TableHead><TableHead>Emisión</TableHead><TableHead aria-label="Acciones" /></TableRow></TableHeader><TableBody>{invoices.map((inv) => invoiceEditingId?.kind === 'existing' && invoiceEditingId.id === inv.id
            ? <TableRow key={inv.id}><TableCell colSpan={6}><InvoiceForm draft={invoiceDraft} setDraft={setInvoiceDraft} proyectos={proyectos} onSave={saveInvoice} onCancel={cancelInvoiceEdit} /></TableCell></TableRow>
            : <TableRow key={inv.id}>
              <TableCell>{proyectoPorId(inv.proyectoId, proyectos).name}</TableCell>
              <TableCell>{inv.folio}</TableCell>
              <TableCell><strong>{fmt(inv.amount)}</strong></TableCell>
              <TableCell><Badge variant="outline" className={`finance-invoice-${inv.status}`}>{invoiceStatusLabel[inv.status]}</Badge></TableCell>
              <TableCell>{inv.issueDate}</TableCell>
              <TableCell><div className="finance-row-actions">
                <button type="button" aria-label={`Editar factura ${inv.folio}`} onClick={() => startEditInvoice(inv)}><Pencil /></button>
                <button type="button" aria-label={`Eliminar factura ${inv.folio}`} onClick={() => portfolio.removeInvoice(inv.id)}><Trash2 /></button>
              </div></TableCell>
            </TableRow>)}</TableBody></Table></div>
        </CardContent>
      </Card>

      <Card className="executive-card finance-panel">
        <CardHeader>
          <div><CardTitle>Pagos recibidos</CardTitle><p>{payments.length} movimientos · {fmt(c.pagado)} cobrados</p></div>
          <div className="finance-crud-actions"><Button variant="outline" size="sm" onClick={startNewPayment}><Plus />Agregar pago</Button></div>
        </CardHeader>
        <CardContent className="finance-table-content">
          {paymentEditingId?.kind === 'new' && <PaymentForm draft={paymentDraft} setDraft={setPaymentDraft} proyectos={proyectos} onSave={savePayment} onCancel={cancelPaymentEdit} />}
          <div className="finance-table-scroll"><Table className="finanzas-table finance-compact-table"><TableHeader><TableRow><TableHead>Proyecto</TableHead><TableHead>Monto</TableHead><TableHead>Fecha de pago</TableHead><TableHead aria-label="Acciones" /></TableRow></TableHeader><TableBody>{payments.map((payment) => paymentEditingId?.kind === 'existing' && paymentEditingId.id === payment.id
            ? <TableRow key={payment.id}><TableCell colSpan={4}><PaymentForm draft={paymentDraft} setDraft={setPaymentDraft} proyectos={proyectos} onSave={savePayment} onCancel={cancelPaymentEdit} /></TableCell></TableRow>
            : <TableRow key={payment.id}>
              <TableCell>{proyectoPorId(payment.proyectoId, proyectos).name}</TableCell>
              <TableCell><strong>{fmt(payment.amount)}</strong></TableCell>
              <TableCell>{payment.paymentDate}</TableCell>
              <TableCell><div className="finance-row-actions">
                <button type="button" aria-label="Editar pago" onClick={() => startEditPayment(payment)}><Pencil /></button>
                <button type="button" aria-label="Eliminar pago" onClick={() => portfolio.removePayment(payment.id)}><Trash2 /></button>
              </div></TableCell>
            </TableRow>)}</TableBody></Table></div>
        </CardContent>
      </Card>
    </div>
    <p className="finance-crud-note"><FlaskConical aria-hidden="true" />Agregar, editar o eliminar aquí actualiza cobranza, riesgo y el resumen ejecutivo en vivo — pero solo en esta sesión del navegador, no queda guardado en ningún sistema.</p>
  </div>;
}

function InvoiceForm({ draft, setDraft, proyectos, onSave, onCancel }: {
  draft: InvoiceDraft; setDraft: (d: InvoiceDraft) => void; proyectos: { id: string; name: string }[]; onSave: () => void; onCancel: () => void;
}) {
  return <form className="finance-crud-form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
    <div className="finance-crud-field">
      <label htmlFor="invoice-proyecto">Proyecto</label>
      <Select value={draft.proyectoId} onValueChange={(value) => setDraft({ ...draft, proyectoId: value as string })}>
        <SelectTrigger id="invoice-proyecto"><SelectValue /></SelectTrigger>
        <SelectContent>{proyectos.map((p) => <SelectItem value={p.id} key={p.id}>{p.name}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div className="finance-crud-field"><label htmlFor="invoice-folio">Folio</label><Input id="invoice-folio" value={draft.folio} onChange={(e) => setDraft({ ...draft, folio: e.target.value })} placeholder="F-2026-0000" /></div>
    <div className="finance-crud-field"><label htmlFor="invoice-amount">Monto</label><Input id="invoice-amount" type="number" min="0" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="0" /></div>
    <div className="finance-crud-field">
      <label htmlFor="invoice-status">Estado</label>
      <Select value={draft.status} onValueChange={(value) => setDraft({ ...draft, status: value as InvoiceStatus })}>
        <SelectTrigger id="invoice-status"><SelectValue /></SelectTrigger>
        <SelectContent>{(Object.keys(invoiceStatusLabel) as InvoiceStatus[]).map((s) => <SelectItem value={s} key={s}>{invoiceStatusLabel[s]}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div className="finance-crud-field"><label htmlFor="invoice-date">Emisión</label><Input id="invoice-date" value={draft.issueDate} onChange={(e) => setDraft({ ...draft, issueDate: e.target.value })} placeholder="10 sep 2026" /></div>
    <div className="finance-crud-form-actions">
      <Button type="submit" size="sm">Guardar</Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}><X />Cancelar</Button>
    </div>
  </form>;
}

function ProyectoForm({ draft, setDraft, onSave, onCancel }: {
  draft: ProyectoDraft; setDraft: (d: ProyectoDraft) => void; onSave: () => void; onCancel: () => void;
}) {
  return <form className="finance-crud-form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
    <div className="finance-crud-field"><label htmlFor="proyecto-name">Nombre</label><Input id="proyecto-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nombre del proyecto" /></div>
    <div className="finance-crud-field"><label htmlFor="proyecto-client">Cliente</label><Input id="proyecto-client" value={draft.client} onChange={(e) => setDraft({ ...draft, client: e.target.value })} placeholder="Dependencia" /></div>
    <div className="finance-crud-field">
      <label htmlFor="proyecto-status">Estatus</label>
      <Select value={draft.status} onValueChange={(value) => setDraft({ ...draft, status: value as ProjectStatus })}>
        <SelectTrigger id="proyecto-status"><SelectValue /></SelectTrigger>
        <SelectContent>{(Object.keys(projectStatusLabel) as ProjectStatus[]).map((s) => <SelectItem value={s} key={s}>{projectStatusLabel[s]}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div className="finance-crud-field"><label htmlFor="proyecto-progress">Avance físico %</label><Input id="proyecto-progress" type="number" min="0" max="100" value={draft.progress} onChange={(e) => setDraft({ ...draft, progress: e.target.value })} /></div>
    <div className="finance-crud-field"><label htmlFor="proyecto-coordinator">Coordinador</label><Input id="proyecto-coordinator" value={draft.coordinator} onChange={(e) => setDraft({ ...draft, coordinator: e.target.value })} placeholder="Sin asignar" /></div>
    <div className="finance-crud-field"><label htmlFor="proyecto-amount">Monto contratado</label><Input id="proyecto-amount" type="number" min="0" value={draft.contractAmount} onChange={(e) => setDraft({ ...draft, contractAmount: e.target.value })} placeholder="0" /></div>
    <div className="finance-crud-field"><label htmlFor="proyecto-start">Inicio de contrato</label><Input id="proyecto-start" value={draft.contractStart} onChange={(e) => setDraft({ ...draft, contractStart: e.target.value })} placeholder="10 sep 2026" /></div>
    <div className="finance-crud-field"><label htmlFor="proyecto-end">Fin de contrato</label><Input id="proyecto-end" value={draft.contractEnd} onChange={(e) => setDraft({ ...draft, contractEnd: e.target.value })} placeholder="10 sep 2027" /></div>
    <div className="finance-crud-form-actions">
      <Button type="submit" size="sm">Guardar</Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}><X />Cancelar</Button>
    </div>
  </form>;
}

function PaymentForm({ draft, setDraft, proyectos, onSave, onCancel }: {
  draft: PaymentDraft; setDraft: (d: PaymentDraft) => void; proyectos: { id: string; name: string }[]; onSave: () => void; onCancel: () => void;
}) {
  return <form className="finance-crud-form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
    <div className="finance-crud-field">
      <label htmlFor="payment-proyecto">Proyecto</label>
      <Select value={draft.proyectoId} onValueChange={(value) => setDraft({ ...draft, proyectoId: value as string })}>
        <SelectTrigger id="payment-proyecto"><SelectValue /></SelectTrigger>
        <SelectContent>{proyectos.map((p) => <SelectItem value={p.id} key={p.id}>{p.name}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div className="finance-crud-field"><label htmlFor="payment-amount">Monto</label><Input id="payment-amount" type="number" min="0" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="0" /></div>
    <div className="finance-crud-field"><label htmlFor="payment-date">Fecha de pago</label><Input id="payment-date" value={draft.paymentDate} onChange={(e) => setDraft({ ...draft, paymentDate: e.target.value })} placeholder="10 sep 2026" /></div>
    <div className="finance-crud-form-actions">
      <Button type="submit" size="sm">Guardar</Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}><X />Cancelar</Button>
    </div>
  </form>;
}
