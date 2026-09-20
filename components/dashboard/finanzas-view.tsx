'use client';

import { useMemo } from 'react';
import { FlaskConical, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  bondsPorVencer, cobranzaConsolidada, diasEntreFallo, invoices, payments,
  proyectoPorId, proyectos, matchResultPorProyecto, type BondStatus,
} from '@/lib/mock-data-finanzas-obra';
import { fmtMXN as fmt, licitacionPorId } from '@/lib/mock-data-helpers';

const bondStatusLabel: Record<BondStatus, string> = {
  vigente: 'Vigente',
  por_vencer: 'Por vencer',
  vencida: 'Vencida',
  liberada: 'Liberada',
};

export function FinanzasView() {
  const c = useMemo(() => cobranzaConsolidada(), []);
  const metrics = [
    { label: 'Monto total contratado', value: fmt(c.montoTotal) },
    { label: 'Facturado', value: fmt(c.facturado), detail: `${c.montoTotal > 0 ? Math.round((c.facturado / c.montoTotal) * 100) : 0}% del total` },
    { label: 'Pagado', value: fmt(c.pagado), detail: `${c.facturado > 0 ? Math.round((c.pagado / c.facturado) * 100) : 0}% de lo facturado` },
    { label: 'Pendiente por cobrar', value: fmt(c.pendientePorCobrar) },
    { label: 'Por ejercer', value: fmt(c.porEjercer) },
  ];

  return <div className="concept-view">
    <Alert className="concept-banner">
      <FlaskConical />
      <div>
        <AlertTitle>Vista de concepto — datos ilustrativos</AlertTitle>
        <AlertDescription>
          Los montos, facturas, pagos y fianzas de esta sección son inventados a mano para mostrar cómo se
          vería el cruce entre licitaciones y proyectos adjudicados. No son datos reales del cliente.
        </AlertDescription>
      </div>
    </Alert>

    <Card className="executive-card">
      <CardHeader><CardTitle>Cobranza consolidada</CardTitle><p>{proyectos.length} proyectos del ejemplo ilustrativo</p></CardHeader>
      <CardContent>
        <section className="metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
          {metrics.map((m) => <Card className="executive-metric" key={m.label}>
            <CardHeader><span>{m.label}</span></CardHeader>
            <CardContent><strong>{m.value}</strong>{m.detail && <p>{m.detail}</p>}</CardContent>
          </Card>)}
        </section>
      </CardContent>
    </Card>

    <Card className="executive-card">
      <CardHeader><div><CardTitle>Fianzas por vencer cruzadas con hitos de GAIP</CardTitle><p>Fuentes: Vista de concepto Finanzas + ComprasMX (fallo real)</p></div><ShieldAlert className="capacidad-alert-icon" /></CardHeader>
      <CardContent>
        {bondsPorVencer.length === 0 && <p>Ninguna fianza está por vencer en este ejemplo.</p>}
        {bondsPorVencer.map((bond) => {
          const proyecto = proyectoPorId(bond.proyectoId);
          const match = matchResultPorProyecto(bond.proyectoId);
          const licitacion = match?.licitacionId ? licitacionPorId(match.licitacionId) : undefined;
          const dias = diasEntreFallo(bond, licitacion?.fallo);
          return <div className="capacidad-expediente" key={bond.id} style={{ marginBottom: 12 }}>
            <span className="capacidad-expediente-dep">{proyecto.client}</span>
            <strong>{proyecto.name}</strong>
            <span className="capacidad-expediente-detalle">
              Fianza de {bond.type} vence el {bond.expiryDate}
              {dias !== null ? ` (${dias} día${dias === 1 ? '' : 's'} de margen desde el fallo)` : ''} ·
              fallo registrado en GAIP: {licitacion?.fallo ?? 'sin fecha'}
            </span>
            <Badge className={`bond-status-${bond.status}`} variant="outline">{bondStatusLabel[bond.status]}</Badge>
          </div>;
        })}
      </CardContent>
    </Card>

    <Card className="executive-card">
      <CardHeader><CardTitle>Facturas y pagos por proyecto</CardTitle><p>Vista de concepto · datos ilustrativos</p></CardHeader>
      <CardContent>
        <Table className="finanzas-table">
          <TableHeader>
            <TableRow>
              <TableHead>Proyecto</TableHead>
              <TableHead>Folio</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Estatus</TableHead>
              <TableHead>Emisión</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => <TableRow key={inv.id}>
              <TableCell>{proyectoPorId(inv.proyectoId).name}</TableCell>
              <TableCell>{inv.folio}</TableCell>
              <TableCell>{fmt(inv.amount)}</TableCell>
              <TableCell><Badge variant="outline">{inv.status === 'pendiente' ? 'Estimación' : inv.status === 'facturado' ? 'Facturada' : 'Pagada'}</Badge></TableCell>
              <TableCell>{inv.issueDate}</TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Card className="executive-card">
      <CardHeader><CardTitle>Pagos recibidos</CardTitle></CardHeader>
      <CardContent>
        <Table className="finanzas-table">
          <TableHeader>
            <TableRow>
              <TableHead>Proyecto</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Fecha de pago</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => <TableRow key={p.id}>
              <TableCell>{proyectoPorId(p.proyectoId).name}</TableCell>
              <TableCell>{fmt(p.amount)}</TableCell>
              <TableCell>{p.paymentDate}</TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>;
}
