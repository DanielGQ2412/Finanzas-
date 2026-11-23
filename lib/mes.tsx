import { createContext, useContext, useState, type ReactNode } from 'react';

import { mesActual, moverMes, type Mes } from './formato';

type ContextoMes = { mes: Mes; cambiarMes: (delta: number) => void };

const Contexto = createContext<ContextoMes | null>(null);

/** Mes que se está viendo, compartido entre Inicio, Gastos fijos y el detalle de carpeta. */
export function MesProvider({ children }: { children: ReactNode }) {
  const [mes, setMes] = useState<Mes>(mesActual);
  const cambiarMes = (delta: number) => setMes((m) => moverMes(m, delta));
  return <Contexto.Provider value={{ mes, cambiarMes }}>{children}</Contexto.Provider>;
}

export function useMes(): ContextoMes {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useMes debe usarse dentro de <MesProvider>');
  return ctx;
}
