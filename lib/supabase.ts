import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const urlEnv = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const keyEnv = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

// Si la URL no es http(s) (por ejemplo, el texto "PEGA_AQUI_..."), se trata como no configurada
// para que la app muestre un aviso en vez de cerrarse.
const url = /^https?:\/\/\S+$/i.test(urlEnv) ? urlEnv : '';
const anonKey = keyEnv && !keyEnv.startsWith('PEGA_AQUI') ? keyEnv : '';

/** true si faltan las variables del archivo .env */
export const faltaConfiguracion = !url || !anonKey;

if (faltaConfiguracion) {
  console.warn(
    'Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY en el archivo .env. ' +
      'Completalas y reiniciá con `npx expo start -c`.',
  );
}

export const supabase = createClient(
  url || 'https://sin-configurar.supabase.co',
  anonKey || 'sin-configurar',
  {
    auth: {
      // En web, supabase-js usa localStorage por defecto; en el teléfono, AsyncStorage.
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  },
);

// En el teléfono, refrescar el token solo mientras la app está en primer plano.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
