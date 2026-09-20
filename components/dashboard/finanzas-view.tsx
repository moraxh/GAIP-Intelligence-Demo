'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowUpRight, CalendarClock, CheckCircle2,
  CircleDollarSign, Clock3, FlaskConical, ShieldAlert, TrendingUp, WalletCards,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  bondsPorVencer, cobranzaConsolidada, diasEntreFallo, diasParaVencer, invoices, payments,
  proyectoPorId, proyectos, riesgoPortafolio, totalFacturado, totalPagado,
  montoTotal, matchResultPorProyecto, type BondStatus, type RiesgoNivel,
} from '@/lib/mock-data-finanzas-obra';
import { fmtMXN as fmt, licitacionPorId } from '@/lib/mock-data-helpers';

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

function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

export function FinanzasView() {
  const [portfolioFilter, setPortfolioFilter] = useState<'todos' | 'atencion'>('todos');
  const c = useMemo(() => cobranzaConsolidada(), []);
  const risks = useMemo(() => riesgoPortafolio(), []);

  const projectRows = useMemo(() => proyectos.map((proyecto) => {
    const total = montoTotal(proyecto.id);
    const facturado = totalFacturado(proyecto.id);
    const pagado = totalPagado(proyecto.id);
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
  }), [risks]);

  const rowsToShow = portfolioFilter === 'atencion'
    ? projectRows.filter((row) => row.needsAttention)
    : projectRows;

  const facturadoPct = percentage(c.facturado, c.montoTotal);
  const pagadoDeFacturadoPct = percentage(c.pagado, c.facturado);
  const pendingProjects = projectRows.filter((row) => row.pendiente > 0).length;
  const attentionCount = projectRows.filter((row) => row.needsAttention).length;

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
            const proyecto = proyectoPorId(bond.proyectoId);
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
        <fieldset className="finance-filter-tabs">
          <legend className="sr-only">Filtrar portafolio</legend>
          <button type="button" className={portfolioFilter === 'todos' ? 'is-active' : ''} aria-pressed={portfolioFilter === 'todos'} onClick={() => setPortfolioFilter('todos')}>Todos <span>{projectRows.length}</span></button>
          <button type="button" className={portfolioFilter === 'atencion' ? 'is-active' : ''} aria-pressed={portfolioFilter === 'atencion'} onClick={() => setPortfolioFilter('atencion')}>Requieren atención <span>{attentionCount}</span></button>
        </fieldset>
      </CardHeader>
      <CardContent className="finance-table-content">
        <div className="finance-table-scroll">
          <Table className="finanzas-table finanzas-portfolio-table">
            <TableHeader><TableRow><TableHead>Proyecto</TableHead><TableHead>Contrato</TableHead><TableHead>Facturado</TableHead><TableHead>Cobrado</TableHead><TableHead>Pendiente</TableHead><TableHead>Avance físico</TableHead><TableHead>Brecha</TableHead><TableHead>Riesgo</TableHead></TableRow></TableHeader>
            <TableBody>{rowsToShow.map((row) => <TableRow key={row.proyecto.id}>
              <TableCell><div className="finance-project-cell"><strong>{row.proyecto.name}</strong><span>{row.proyecto.client} · {row.proyecto.coordinator}</span></div></TableCell>
              <TableCell><strong>{fmt(row.total)}</strong><span className="finance-cell-sub">{row.porEjercer > 0 ? `${fmt(row.porEjercer)} por ejercer` : 'Contrato agotado'}</span></TableCell>
              <TableCell><strong>{fmt(row.facturado)}</strong><span className="finance-cell-sub">{row.pctFacturado}%</span></TableCell>
              <TableCell><strong>{fmt(row.pagado)}</strong><span className="finance-cell-sub">{percentage(row.pagado, row.facturado)}% de facturado</span></TableCell>
              <TableCell><strong className={row.pendiente > 0 ? 'finance-text-warning' : 'finance-text-ok'}>{fmt(row.pendiente)}</strong></TableCell>
              <TableCell><div className="finance-progress-cell"><div className="finance-mini-track"><i style={{ width: `${row.proyecto.progress}%` }} /></div><strong>{row.proyecto.progress}%</strong></div></TableCell>
              <TableCell><span className={`finance-delta finance-delta-${row.delta <= 10 ? 'ok' : row.delta <= 25 ? 'warning' : 'danger'}`}>{row.delta === 0 ? 'Alineado' : `${row.delta.toFixed(1)} pts`}</span><span className="finance-cell-sub">{row.delta === 0 ? 'avance y cobro' : row.balance > 0 ? 'obra adelante' : 'facturación adelante'}</span></TableCell>
              <TableCell><span className={`finance-risk-badge finance-risk-badge-${row.risk?.nivel ?? 'bajo'}`}>{riskLabel[row.risk?.nivel ?? 'bajo']}</span></TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <div className="finanzas-transactions-grid">
      <Card className="executive-card finance-panel">
        <CardHeader><div><CardTitle>Facturas emitidas</CardTitle><p>{invoices.length} movimientos · {fmt(c.facturado)} acumulado</p></div><Badge className="finance-count-badge" variant="outline">{invoices.filter((item) => item.status === 'facturado').length} por cobrar</Badge></CardHeader>
        <CardContent className="finance-table-content"><div className="finance-table-scroll"><Table className="finanzas-table finance-compact-table"><TableHeader><TableRow><TableHead>Proyecto</TableHead><TableHead>Folio</TableHead><TableHead>Monto</TableHead><TableHead>Estado</TableHead><TableHead>Emisión</TableHead></TableRow></TableHeader><TableBody>{invoices.map((inv) => <TableRow key={inv.id}><TableCell>{proyectoPorId(inv.proyectoId).name}</TableCell><TableCell>{inv.folio}</TableCell><TableCell><strong>{fmt(inv.amount)}</strong></TableCell><TableCell><Badge variant="outline" className={`finance-invoice-${inv.status}`}>{invoiceStatusLabel[inv.status]}</Badge></TableCell><TableCell>{inv.issueDate}</TableCell></TableRow>)}</TableBody></Table></div></CardContent>
      </Card>

      <Card className="executive-card finance-panel">
        <CardHeader><div><CardTitle>Pagos recibidos</CardTitle><p>{payments.length} movimientos · {fmt(c.pagado)} cobrados</p></div><Badge className="finance-count-badge" variant="outline"><CheckCircle2 aria-hidden="true" /> Conciliados</Badge></CardHeader>
        <CardContent className="finance-table-content"><div className="finance-table-scroll"><Table className="finanzas-table finance-compact-table"><TableHeader><TableRow><TableHead>Proyecto</TableHead><TableHead>Monto</TableHead><TableHead>Fecha de pago</TableHead></TableRow></TableHeader><TableBody>{payments.map((payment) => <TableRow key={payment.id}><TableCell>{proyectoPorId(payment.proyectoId).name}</TableCell><TableCell><strong>{fmt(payment.amount)}</strong></TableCell><TableCell>{payment.paymentDate}</TableCell></TableRow>)}</TableBody></Table></div></CardContent>
      </Card>
    </div>
  </div>;
}
