'use client';

// Diálogo compartido para crear/editar un proyecto del portafolio ilustrativo. Vive aparte
// de finanzas-view.tsx/obra-view.tsx porque ambas vistas necesitan poder abrir "Agregar
// proyecto": Finanzas lo tiene en la tabla "Portafolio por proyecto", Obra lo agrega junto a
// "Portafolio de proyectos" para no obligar a cambiar de pantalla solo para dar de alta uno.

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type ProjectStatus, type ProyectoIlustrativo } from '@/lib/mock-data-finanzas-obra';

export const projectStatusLabel: Record<ProjectStatus, string> = {
  activo: 'Activo',
  en_pausa: 'En pausa',
  en_riesgo: 'En riesgo',
  terminado: 'Terminado',
  cancelado: 'Cancelado',
};

export type ProyectoDraft = {
  name: string; client: string; status: ProjectStatus; progress: string; coordinator: string;
  contractAmount: string; contractStart: string; contractEnd: string;
};

export function proyectoToDraft(p: ProyectoIlustrativo): ProyectoDraft {
  return {
    name: p.name, client: p.client, status: p.status, progress: String(p.progress), coordinator: p.coordinator,
    contractAmount: String(p.contractAmount), contractStart: p.contractStart, contractEnd: p.contractEnd,
  };
}

export const emptyProyectoDraft: ProyectoDraft = {
  name: '', client: '', status: 'activo', progress: '0', coordinator: 'Sin asignar', contractAmount: '', contractStart: '', contractEnd: '',
};

export function ProyectoDialog({ open, isNew, draft, setDraft, onSave, onCancel }: {
  open: boolean; isNew: boolean; draft: ProyectoDraft; setDraft: (d: ProyectoDraft) => void; onSave: () => void; onCancel: () => void;
}) {
  return <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
    <DialogContent className="crud-dialog crud-dialog-wide">
      <DialogHeader>
        <DialogTitle>{isNew ? 'Agregar proyecto' : 'Editar proyecto'}</DialogTitle>
        <DialogDescription>Datos ilustrativos del portafolio de proyectos.</DialogDescription>
      </DialogHeader>
      <form className="crud-dialog-form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        <div className="crud-dialog-row">
          <div className="crud-dialog-field"><label htmlFor="proyecto-name">Nombre</label><Input id="proyecto-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nombre del proyecto" /></div>
          <div className="crud-dialog-field"><label htmlFor="proyecto-client">Cliente</label><Input id="proyecto-client" value={draft.client} onChange={(e) => setDraft({ ...draft, client: e.target.value })} placeholder="Dependencia" /></div>
        </div>
        <div className="crud-dialog-row">
          <div className="crud-dialog-field">
            <label htmlFor="proyecto-status">Estatus</label>
            <Select value={draft.status} onValueChange={(value) => setDraft({ ...draft, status: value as ProjectStatus })}>
              <SelectTrigger id="proyecto-status" className="crud-dialog-select-trigger"><SelectValue>{(value: ProjectStatus) => projectStatusLabel[value]}</SelectValue></SelectTrigger>
              <SelectContent>{(Object.keys(projectStatusLabel) as ProjectStatus[]).map((s) => <SelectItem value={s} key={s}>{projectStatusLabel[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="crud-dialog-field"><label htmlFor="proyecto-progress">Avance físico %</label><Input id="proyecto-progress" type="number" min="0" max="100" value={draft.progress} onChange={(e) => setDraft({ ...draft, progress: e.target.value })} /></div>
          <div className="crud-dialog-field"><label htmlFor="proyecto-coordinator">Coordinador</label><Input id="proyecto-coordinator" value={draft.coordinator} onChange={(e) => setDraft({ ...draft, coordinator: e.target.value })} placeholder="Sin asignar" /></div>
        </div>
        <div className="crud-dialog-row">
          <div className="crud-dialog-field"><label htmlFor="proyecto-amount">Monto contratado</label><Input id="proyecto-amount" type="number" min="0" value={draft.contractAmount} onChange={(e) => setDraft({ ...draft, contractAmount: e.target.value })} placeholder="0" /></div>
          <div className="crud-dialog-field"><label htmlFor="proyecto-start">Inicio de contrato</label><Input id="proyecto-start" value={draft.contractStart} onChange={(e) => setDraft({ ...draft, contractStart: e.target.value })} placeholder="10 sep 2026" /></div>
          <div className="crud-dialog-field"><label htmlFor="proyecto-end">Fin de contrato</label><Input id="proyecto-end" value={draft.contractEnd} onChange={(e) => setDraft({ ...draft, contractEnd: e.target.value })} placeholder="10 sep 2027" /></div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button type="submit">Guardar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
