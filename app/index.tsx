import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useSesion } from '@/lib/sesion';
import { useTema } from '@/lib/tema';

export default function Index() {
  const { sesion, cargando } = useSesion();
  const c = useTema();

  if (cargando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fondo }}>
        <ActivityIndicator color={c.primario} size="large" />
      </View>
    );
  }

  return <Redirect href={sesion ? '/inicio' : '/login'} />;
}
