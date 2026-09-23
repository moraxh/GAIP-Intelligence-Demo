'use client';

// Envuelve los providers de cliente (Context, etc.) en un componente propio, separado del
// <html>/<body> del layout raíz. RootLayout (app/layout.tsx) es un Server Component; si
// importa PortfolioProvider directamente y lo usa envolviendo {children} ahí mismo, vinext
// puede desincronizar el árbol servidor/cliente alrededor de <html>/<body> tras varios
// hot-reloads en dev (visto como "Hydration failed... lang={null}"). Este componente aparte
// es el boundary cliente; RootLayout solo lo importa y lo monta, sin lógica de estado propia.

import type { ReactNode } from 'react';
import { PortfolioProvider } from '@/lib/portfolio-store';

export function Providers({ children }: { children: ReactNode }) {
  return <PortfolioProvider>{children}</PortfolioProvider>;
}
