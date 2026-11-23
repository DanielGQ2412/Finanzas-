import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

type ContextoSesion = {
  sesion: Session | null;
  cargando: boolean;
  cerrarSesion: () => Promise<void>;
};

const Contexto = createContext<ContextoSesion | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (activo) setSesion(data.session);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion);
    });

    return () => {
      activo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Contexto.Provider value={{ sesion, cargando, cerrarSesion }}>{children}</Contexto.Provider>
  );
}

export function useSesion(): ContextoSesion {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useSesion debe usarse dentro de <SesionProvider>');
  return ctx;
}
