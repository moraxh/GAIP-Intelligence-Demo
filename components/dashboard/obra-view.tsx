'use client';

import { useMemo } from 'react';
import { FlaskConical, HardHat } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  proyectos, semaforoDesfase, weeklyGoals, matchResultPorProyecto, type SemaforoDesfase,
} from '@/lib/mock-data-finanzas-obra';
import { licitacionPorId } from '@/lib/mock-data-helpers';

const semaforoLabel: Record<SemaforoDesfase, string> = {
  alineado: 'Alineado',
  amarillo: 'Desfase moderado',
  rojo: 'Desfase alto',
};

function avanceGantt(licitacionId: string | null | undefined): number | null {
  if (!licitacionId) return null;
  const licitacion = licitacionPorId(licitacionId);
  if (!licitacion?.tareas?.length) return null;
  return Math.round((licitacion.tareas.reduce((sum, t) => sum + t.avance, 0) / licitacion.tareas.length) * 10) / 10;
}

export function ObraView() {
  const filas = useMemo(
    () => proyectos.map((proyecto) => {
      const match = matchResultPorProyecto(proyecto.id);
      return {
        proyecto,
        gantt: avanceGantt(match?.licitacionId),
        ...semaforoDesfase(proyecto.id),
      };
    }),
    [],
  );

  const peorDesfase = [...filas].sort((a, b) => b.desfase - a.desfase)[0];

  return <div className="concept-view">
    {peorDesfase && peorDesfase.nivel !== 'alineado' && <div className="concept-headline">
      <HardHat />
      <div>
        <strong>{peorDesfase.proyecto.name}: {peorDesfase.desfase} pts de diferencia entre avance físico y lo facturado.</strong>
        <span>El Gantt de licitación no sabe qué pasa en obra; el avance de obra no sabe qué se facturó. Cruzar ambas fuentes es lo que expone el desfase.</span>
      </div>
    </div>}

    <Card className="executive-card">
      <CardHeader>
        <div><CardTitle>Avance físico vs. Gantt administrativo</CardTitle><p>Fuentes: Vista de concepto Obra + Excel de Gantt (avance de propuesta, real)</p></div>
        <span className="concept-badge"><FlaskConical />Datos ilustrativos</span>
      </CardHeader>
      <CardContent>
        {filas.map(({ proyecto, gantt, desfase, nivel }) => {
          return <div key={proyecto.id} style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <strong>{proyecto.name}</strong>
              <span className={`desfase-${nivel}`}>{semaforoLabel[nivel]} · {desfase} pts vs. facturado (ver Finanzas)</span>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', marginBottom: 2 }}>
                  <span>Avance físico de obra</span><b>{proyecto.progress}%</b>
                </div>
                <Progress value={proyecto.progress} />
              </div>
              {gantt !== null ? <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', marginBottom: 2 }}>
                  <span>Avance de propuesta (Gantt de licitación, dato real)</span><b>{gantt}%</b>
                </div>
                <Progress value={gantt} />
              </div> : <p style={{ fontSize: '.75rem', color: 'var(--muted-foreground)' }}>Este expediente no tiene Gantt de licitación registrado en GAIP.</p>}
            </div>
          </div>;
        })}
      </CardContent>
    </Card>

    <Card className="executive-card">
      <CardHeader><CardTitle>Objetivos semanales</CardTitle></CardHeader>
      <CardContent>
        <div className="deadline-list">
          {weeklyGoals.map((goal) => {
            const proyecto = proyectos.find((p) => p.id === goal.proyectoId);
            return <div className="deadline" key={goal.id}>
              <div><strong>{proyecto?.name}</strong><span>{goal.objetivo}</span></div>
              <b>{goal.completadoPct}%</b>
            </div>;
          })}
        </div>
      </CardContent>
    </Card>
  </div>;
}
