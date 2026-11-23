import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mensajeError, obtenerCarpetas, obtenerEspacioPersonal, type Prioridad } from '@/lib/finanzas';
import { crearCarpetaFija } from '@/lib/fijos';
import { useSesion } from '@/lib/sesion';
import { espacio, useTema } from '@/lib/tema';
import { BotonPrincipal, CajaError, Chip, Etiqueta, ui } from '@/lib/ui';

const PRIORIDADES: { valor: Prioridad; texto: string }[] = [
  { valor: 'alta', texto: 'Alta' },
  { valor: 'media', texto: 'Media' },
  { valor: 'baja', texto: 'Baja' },
];

function volver() {
  if (router.canGoBack()) router.back();
  else router.replace('/fijos');
}

/** Crea una carpeta de gastos fijos (tipo 'fijo') en el espacio Personal. */
export default function NuevaCarpeta() {
  const c = useTema();
  const { sesion } = useSesion();
  const [nombre, setNombre] = useState('');
  const [prioridad, setPrioridad] = useState<Prioridad>('media');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    const limpio = nombre.trim();
    if (!limpio) return setError('Escribí un nombre para la carpeta.');
    if (!sesion) return;
    setError(null);
    setGuardando(true);
    try {
      const espacioId = await obtenerEspacioPersonal(sesion.user.id);
      if (!espacioId) throw new Error('sin espacio personal');
      const existentes = await obtenerCarpetas(espacioId);
      if (existentes.some((k) => k.nombre.toLowerCase() === limpio.toLowerCase())) {
        setError(`Ya tenés una carpeta llamada "${limpio}".`);
        setGuardando(false);
        return;
      }
      const orden = existentes.reduce((m, k) => Math.max(m, k.orden ?? 0), 0) + 1;
      await crearCarpetaFija(espacioId, limpio, prioridad, orden);
      volver();
    } catch (e) {
      setError(mensajeError(e as { message?: string; code?: string }, 'crear la carpeta'));
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.fondo }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={ui.contenido} keyboardShouldPersistTaps="handled">
          <View style={ui.encabezadoModal}>
            <Pressable onPress={volver} style={ui.botonTexto} accessibilityRole="button">
              <Text style={{ color: c.primario, fontSize: 16, fontWeight: '600' }}>Cancelar</Text>
            </Pressable>
            <Text style={{ color: c.texto, fontSize: 18, fontWeight: '700' }}>Nueva carpeta</Text>
            <View style={ui.botonTexto} />
          </View>

          <Text style={{ color: c.textoSuave }}>Se crea como carpeta de gastos fijos.</Text>

          <Etiqueta c={c} texto="Nombre" />
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej.: Seguros, Suscripciones"
            placeholderTextColor={c.textoSuave}
            maxLength={40}
            autoFocus
            style={[ui.campo, { color: c.texto, backgroundColor: c.superficie, borderColor: c.borde }]}
          />

          <Etiqueta c={c} texto="Prioridad" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s }}>
            {PRIORIDADES.map((p) => (
              <Chip key={p.valor} c={c} texto={p.texto} activo={p.valor === prioridad} onPress={() => setPrioridad(p.valor)} />
            ))}
          </View>

          <CajaError c={c} texto={error} />
          <BotonPrincipal c={c} texto="Crear carpeta" onPress={guardar} ocupado={guardando} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
