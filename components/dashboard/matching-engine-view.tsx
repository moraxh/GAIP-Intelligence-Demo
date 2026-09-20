'use client';

import { useState } from 'react';
import { FlaskConical, GitMerge, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { proyectos, matchResults, MATCH_THRESHOLD, type MatchResult, type MatchSignal } from '@/lib/mock-data-finanzas-obra';
import { licitacionPorId } from '@/lib/mock-data-helpers';

const signalLabel: Record<MatchSignal['name'], string> = {
  numero: 'Número de procedimiento',
  nombre: 'Nombre',
  dependencia: 'Dependencia / cliente',
  fechaFallo: 'Fecha de fallo → inicio de contrato',
};

function signalBand(signal: MatchSignal): 'alineado' | 'amarillo' | 'rojo' {
  if (!signal.applicable) return 'amarillo';
  if (signal.score >= 0.9) return 'alineado';
  if (signal.score >= 0.5) return 'amarillo';
  return 'rojo';
}

function MatchScoreRing({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return <div className="score-ring" style={{ '--score': `${pct * 3.6}deg`, width: 48, height: 48 } as React.CSSProperties}><span style={{ fontSize: '.7rem' }}>{pct}%</span></div>;
}

function SignalRow({ signal }: { signal: MatchSignal }) {
  const band = signalBand(signal);
  return <div className="capacidad-expediente-detalle" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
    <span className={`desfase-${band}`} style={{ minWidth: 18, textAlign: 'center' }}>●</span>
    <span style={{ minWidth: 220 }}>{signalLabel[signal.name]}</span>
    <span style={{ color: 'var(--muted-foreground)', fontSize: '.75rem' }}>{signal.detail}</span>
  </div>;
}

function MatchRow({ result }: { result: MatchResult }) {
  const [open, setOpen] = useState(false);
  const proyecto = proyectos.find((p) => p.id === result.proyectoId)!;
  const licitacionVinculada = result.licitacionId ? licitacionPorId(result.licitacionId) : undefined;
  const candidatoRechazado = result.bestRejectedCandidate;
  const licitacionCandidata = candidatoRechazado ? licitacionPorId(candidatoRechazado.licitacionId) : undefined;

  return <button
    type="button"
    className="capacidad-expediente"
    style={{ marginBottom: 12, cursor: 'pointer', width: '100%', textAlign: 'left' }}
    onClick={() => setOpen((v) => !v)}
    aria-expanded={open}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <span className="capacidad-expediente-dep">{proyecto.client}</span>
        <strong style={{ display: 'block' }}>{proyecto.name}</strong>
        {result.autoLinked && licitacionVinculada && <span className="capacidad-expediente-detalle">Vinculado con {licitacionVinculada.numero} — {licitacionVinculada.nombre}</span>}
        {!result.autoLinked && <span className="capacidad-expediente-detalle">
          {candidatoRechazado
            ? `No se alcanzó el umbral de confianza (${Math.round(candidatoRechazado.score * 100)}% con ${licitacionCandidata?.numero ?? 'candidato'}). El motor prefiere no vincular antes que adivinar.`
            : 'Sin ningún candidato con similitud suficiente.'}
        </span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {result.ambiguous && <Badge className="match-status-ambiguous" variant="outline">Ambiguo, resuelto por regla</Badge>}
        <Badge className={result.autoLinked ? 'match-status-auto' : 'match-status-none'} variant="outline">
          {result.autoLinked ? 'Vinculado automáticamente' : 'Sin vincular'}
        </Badge>
        <MatchScoreRing score={result.score ?? candidatoRechazado?.score ?? 0} />
        <ChevronDown style={{ width: 16, height: 16, transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
      </div>
    </div>
    {open && <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--hairline, #e5e5e5)' }}>
      {result.signals.map((s) => <SignalRow key={s.name} signal={s} />)}
    </div>}
  </button>;
}

export function MatchingEngineView() {
  const vinculados = matchResults.filter((r) => r.autoLinked).length;

  return <div className="concept-view">
    <Alert className="concept-banner">
      <FlaskConical />
      <div>
        <AlertTitle>Vista de concepto — motor de cruce en vivo</AlertTitle>
        <AlertDescription>
          El cruce que ves abajo lo calcula el motor de matching en tiempo real sobre estos datos
          (número de procedimiento, nombre, dependencia y fechas) — no está hardcodeado. Ningún ID
          compartido conecta estas dos fuentes; así se resolvería el cruce con datos reales del
          cliente si tampoco lo trajeran.
        </AlertDescription>
      </div>
    </Alert>

    <Card className="executive-card">
      <CardHeader><div><CardTitle>Cruce automático de datos</CardTitle><p>Umbral de confianza: {Math.round(MATCH_THRESHOLD * 100)}% · {vinculados} de {proyectos.length} proyectos vinculados</p></div><GitMerge className="capacidad-alert-icon" /></CardHeader>
      <CardContent>
        {matchResults.map((r) => <MatchRow key={r.proyectoId} result={r} />)}
      </CardContent>
    </Card>
  </div>;
}
