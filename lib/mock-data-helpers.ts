import { licitaciones, type Licitacion } from '@/lib/mock-data';

export function licitacionPorId(id: string): Licitacion | undefined {
  return licitaciones.find((item) => item.id === id);
}

export function fmtMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
}
