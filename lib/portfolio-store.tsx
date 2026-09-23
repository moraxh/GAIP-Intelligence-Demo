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
  proyectos as proyectosBase, addendas as addendasBase,
  type InvoiceIlustrativa, type PaymentIlustrativo, type BondIlustrativo,
  type ProyectoIlustrativo, type AddendaIlustrativa,
} from '@/lib/mock-data-finanzas-obra';

type PortfolioState = {
  proyectos: ProyectoIlustrativo[];
  invoices: InvoiceIlustrativa[];
  payments: PaymentIlustrativo[];
  bonds: BondIlustrativo[];
  addendas: AddendaIlustrativa[];
};

type PortfolioActions = {
  addInvoice: (invoice: Omit<InvoiceIlustrativa, 'id'>) => void;
  updateInvoice: (id: string, patch: Partial<Omit<InvoiceIlustrativa, 'id'>>) => void;
  removeInvoice: (id: string) => void;
  addPayment: (payment: Omit<PaymentIlustrativo, 'id'>) => void;
  updatePayment: (id: string, patch: Partial<Omit<PaymentIlustrativo, 'id'>>) => void;
  removePayment: (id: string) => void;
  updateProyectoProgress: (proyectoId: string, progress: number) => void;
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
  const [bonds] = useState(bondsBase);
  const [addendas] = useState(addendasBase);
  const [isDirty, setIsDirty] = useState(false);

  const value = useMemo<PortfolioContextValue>(() => ({
    proyectos,
    invoices,
    payments,
    bonds,
    addendas,
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
    updateProyectoProgress: (proyectoId, progress) => {
      setProyectos((prev) => prev.map((item) => (item.id === proyectoId ? { ...item, progress } : item)));
      setIsDirty(true);
    },
    resetToBase: () => {
      setProyectos(proyectosBase);
      setInvoices(invoicesBase);
      setPayments(paymentsBase);
      setIsDirty(false);
    },
  }), [proyectos, invoices, payments, bonds, addendas, isDirty]);

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio debe usarse dentro de <PortfolioProvider>');
  return ctx;
}
