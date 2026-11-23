import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useSesion } from '@/lib/sesion';
import { useTema } from '@/lib/tema';

/** Protege las rutas privadas: sin sesión, manda al login. */
export default function LayoutPrivado() {
  const { sesion, cargando } = useSesion();
  const c = useTema();

  if (cargando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fondo }}>
        <ActivityIndicator color={c.primario} size="large" />
      </View>
    );
  }

  if (!sesion) return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.fondo } }}
    />
  );
}
