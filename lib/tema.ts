import { useColorScheme } from 'react-native';

export type Colores = {
  fondo: string;
  superficie: string;
  texto: string;
  textoSuave: string;
  primario: string;
  sobrePrimario: string;
  positivo: string;
  error: string;
  borde: string;
};

const claro: Colores = {
  fondo: '#FFFFFF',
  superficie: '#F6F2FA',
  texto: '#10002B',
  textoSuave: '#5C5470',
  primario: '#5A189A',
  sobrePrimario: '#FFFFFF',
  positivo: '#2D8A5F',
  error: '#C1121F',
  borde: '#DDD3EA',
};

const oscuro: Colores = {
  fondo: '#0E0D12',
  superficie: '#1A1822',
  texto: '#F3EEFA',
  textoSuave: '#A9A2B8',
  primario: '#9D4EDD',
  sobrePrimario: '#FFFFFF',
  positivo: '#74C69D',
  error: '#FF6B6B',
  borde: '#2E2A3A',
};

/** Colores de marca fijos (referencia). */
export const marca = {
  morado: '#5A189A',
  menta: '#74C69D',
  texto: '#10002B',
  fondoOscuro: '#0E0D12',
} as const;

/** Altura mínima de botones y campos táctiles. */
export const ALTURA_TACTIL = 48;

export const espacio = { xs: 4, s: 8, m: 16, l: 24, xl: 32 } as const;
export const radio = { s: 8, m: 12, l: 16 } as const;

/** Devuelve la paleta según el modo claro/oscuro del sistema. */
export function useTema(): Colores {
  return useColorScheme() === 'dark' ? oscuro : claro;
}
