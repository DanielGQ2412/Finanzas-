import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

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
