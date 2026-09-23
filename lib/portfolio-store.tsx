'use client';

// Estado editable en memoria del portafolio ilustrativo (Tablero de Proyectos). Vive en el
// árbol de React (no en localStorage ni backend) a propósito: es una demo de concepto, no
// un sistema de persistencia real, y decirlo así es parte de la regla de honestidad visual
// del proyecto (ver docs/ejemplo-ilustrativo-cruce.md). Se resetea al recargar la página,
// pero MIENTRAS la demo está abierta, agregar/editar/eliminar una factura o pago aquí SÍ
// recalcula cobranza, desfase de obra y ranking de riesgo en vivo, y ese cambio se ve
// propagado en Finanzas, Obra y el resumen ejecutivo — no es un mockup que no hace nada.
//
// lib/mock-data.ts (el pipeline de datos REALES de GAIP) nunca se edita desde aquí: este
// store solo envuelve los datasets ilustrativos de lib/mock-data-finanzas-obra.ts.

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  invoices as invoicesBase, payments as paymentsBase, bonds as bondsBase,
  proyectos as proyectosBase, addendas as addendasBase, weeklyGoals as weeklyGoalsBase,
  type InvoiceIlustrativa, type PaymentIlustrativo, type BondIlustrativo,
  type ProyectoIlustrativo, type AddendaIlustrativa, type WeeklyGoalIlustrativo,
} from '@/lib/mock-data-finanzas-obra';

type PortfolioState = {
  proyectos: ProyectoIlustrativo[];
  invoices: InvoiceIlustrativa[];
  payments: PaymentIlustrativo[];
  bonds: BondIlustrativo[];
  addendas: AddendaIlustrativa[];
  weeklyGoals: WeeklyGoalIlustrativo[];
};

type PortfolioActions = {
  addInvoice: (invoice: Omit<InvoiceIlustrativa, 'id'>) => void;
  updateInvoice: (id: string, patch: Partial<Omit<InvoiceIlustrativa, 'id'>>) => void;
  removeInvoice: (id: string) => void;
  addPayment: (payment: Omit<PaymentIlustrativo, 'id'>) => void;
  updatePayment: (id: string, patch: Partial<Omit<PaymentIlustrativo, 'id'>>) => void;
  removePayment: (id: string) => void;
  addProyecto: (proyecto: Omit<ProyectoIlustrativo, 'id'>) => void;
  updateProyecto: (id: string, patch: Partial<Omit<ProyectoIlustrativo, 'id'>>) => void;
  removeProyecto: (id: string) => void;
  updateProyectoProgress: (proyectoId: string, progress: number) => void;
  addBond: (bond: Omit<BondIlustrativo, 'id'>) => void;
  updateBond: (id: string, patch: Partial<Omit<BondIlustrativo, 'id'>>) => void;
  removeBond: (id: string) => void;
  addWeeklyGoal: (goal: Omit<WeeklyGoalIlustrativo, 'id'>) => void;
  updateWeeklyGoal: (id: string, patch: Partial<Omit<WeeklyGoalIlustrativo, 'id'>>) => void;
  removeWeeklyGoal: (id: string) => void;
  resetToBase: () => void;
};

type PortfolioContextValue = PortfolioState & PortfolioActions & { isDirty: boolean };

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

let nextId = 1;
function generateId(prefix: string): string {
  return `${prefix}-manual-${nextId++}`;
}

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [proyectos, setProyectos] = useState(proyectosBase);
  const [invoices, setInvoices] = useState(invoicesBase);
  const [payments, setPayments] = useState(paymentsBase);
  const [bonds, setBonds] = useState(bondsBase);
  const [weeklyGoals, setWeeklyGoals] = useState(weeklyGoalsBase);
  const [addendas] = useState(addendasBase);
  const [isDirty, setIsDirty] = useState(false);

  const value = useMemo<PortfolioContextValue>(() => ({
    proyectos,
    invoices,
    payments,
    bonds,
    addendas,
    weeklyGoals,
    isDirty,
    addInvoice: (invoice) => {
      setInvoices((prev) => [...prev, { ...invoice, id: generateId('inv') }]);
      setIsDirty(true);
    },
    updateInvoice: (id, patch) => {
      setInvoices((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
      setIsDirty(true);
    },
    removeInvoice: (id) => {
      setInvoices((prev) => prev.filter((item) => item.id !== id));
      setIsDirty(true);
    },
    addPayment: (payment) => {
      setPayments((prev) => [...prev, { ...payment, id: generateId('pay') }]);
      setIsDirty(true);
    },
    updatePayment: (id, patch) => {
      setPayments((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
      setIsDirty(true);
    },
    removePayment: (id) => {
      setPayments((prev) => prev.filter((item) => item.id !== id));
      setIsDirty(true);
    },
    addProyecto: (proyecto) => {
      setProyectos((prev) => [...prev, { ...proyecto, id: generateId('proj') }]);
      setIsDirty(true);
    },
    updateProyecto: (id, patch) => {
      setProyectos((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
      setIsDirty(true);
    },
    removeProyecto: (id) => {
      setProyectos((prev) => prev.filter((item) => item.id !== id));
      // Un proyecto eliminado deja huérfanas sus facturas/pagos/fianzas/objetivos — se
      // limpian en cascada para que la cobranza y el ranking de riesgo no sigan sumando
      // movimientos de un proyecto que ya no existe.
      setInvoices((prev) => prev.filter((item) => item.proyectoId !== id));
      setPayments((prev) => prev.filter((item) => item.proyectoId !== id));
      setBonds((prev) => prev.filter((item) => item.proyectoId !== id));
      setWeeklyGoals((prev) => prev.filter((item) => item.proyectoId !== id));
      setIsDirty(true);
    },
    updateProyectoProgress: (proyectoId, progress) => {
      setProyectos((prev) => prev.map((item) => (item.id === proyectoId ? { ...item, progress } : item)));
      setIsDirty(true);
    },
    addBond: (bond) => {
      setBonds((prev) => [...prev, { ...bond, id: generateId('bond') }]);
      setIsDirty(true);
    },
    updateBond: (id, patch) => {
      setBonds((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
      setIsDirty(true);
    },
    removeBond: (id) => {
      setBonds((prev) => prev.filter((item) => item.id !== id));
      setIsDirty(true);
    },
    addWeeklyGoal: (goal) => {
      setWeeklyGoals((prev) => [...prev, { ...goal, id: generateId('wg') }]);
      setIsDirty(true);
    },
    updateWeeklyGoal: (id, patch) => {
      setWeeklyGoals((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
      setIsDirty(true);
    },
    removeWeeklyGoal: (id) => {
      setWeeklyGoals((prev) => prev.filter((item) => item.id !== id));
      setIsDirty(true);
    },
    resetToBase: () => {
      setProyectos(proyectosBase);
      setInvoices(invoicesBase);
      setPayments(paymentsBase);
      setBonds(bondsBase);
      setWeeklyGoals(weeklyGoalsBase);
      setIsDirty(false);
    },
  }), [proyectos, invoices, payments, bonds, weeklyGoals, addendas, isDirty]);

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio debe usarse dentro de <PortfolioProvider>');
  return ctx;
}
