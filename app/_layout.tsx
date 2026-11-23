import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SesionProvider } from '@/lib/sesion';
import { useTema } from '@/lib/tema';

export default function RootLayout() {
  const c = useTema();

  return (
    <SesionProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.fondo },
        }}
      />
    </SesionProvider>
  );
}
