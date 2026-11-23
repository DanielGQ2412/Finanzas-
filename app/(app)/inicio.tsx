import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSesion } from '@/lib/sesion';
import { supabase } from '@/lib/supabase';
import { ALTURA_TACTIL, espacio, radio, useTema } from '@/lib/tema';

type Espacio = { id: string | number; nombre?: string | null; tipo?: string | null };

export default function Inicio() {
  const c = useTema();
  const { sesion, cerrarSesion } = useSesion();
  const [nombre, setNombre] = useState<string | null>(null);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usuarioId = sesion?.user.id;

  const cargar = useCallback(async () => {
    if (!usuarioId) return;
    setError(null);

    const [perfil, lista] = await Promise.all([
      supabase.from('perfiles').select('*').eq('id', usuarioId).maybeSingle(),
      supabase.from('espacios').select('*'),
    ]);

    if (perfil.error || lista.error) {
      setError('No se pudieron cargar tus datos. Deslizá hacia abajo para reintentar.');
      console.warn(perfil.error ?? lista.error);
    }
    setNombre((perfil.data?.nombre as string | undefined) ?? null);
    setEspacios((lista.data as Espacio[] | null) ?? []);
  }, [usuarioId]);

  useEffect(() => {
    cargar().finally(() => setCargando(false));
  }, [cargar]);

  const refrescar = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  const saludo = nombre ?? sesion?.user.email ?? '';

  return (
    <SafeAreaView style={[styles.pantalla, { backgroundColor: c.fondo }]}>
      <View style={styles.encabezado}>
        <Text style={[styles.saludo, { color: c.texto }]} numberOfLines={1}>
          Hola, {saludo}
        </Text>
        <Pressable
          onPress={cerrarSesion}
          style={({ pressed }) => [
            styles.botonSalir,
            { borderColor: c.primario, opacity: pressed ? 0.7 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión">
          <Text style={{ color: c.primario, fontWeight: '700' }}>Cerrar sesión</Text>
        </Pressable>
      </View>

      <Text style={[styles.seccion, { color: c.textoSuave }]}>Tus espacios</Text>

      {cargando ? (
        <ActivityIndicator color={c.primario} size="large" style={{ marginTop: espacio.xl }} />
      ) : (
        <FlatList
          data={espacios}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.primario} />
          }
          ListHeaderComponent={
            error ? <Text style={[styles.error, { color: c.error }]}>{error}</Text> : undefined
          }
          ListEmptyComponent={
            !error ? (
              <Text style={{ color: c.textoSuave }}>Todavía no tenés espacios.</Text>
            ) : undefined
          }
          renderItem={({ item }) => (
            <View style={[styles.tarjeta, { backgroundColor: c.superficie, borderColor: c.borde }]}>
              <View style={[styles.punto, { backgroundColor: c.positivo }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.nombreEspacio, { color: c.texto }]}>
                  {item.nombre ?? 'Sin nombre'}
                </Text>
                {item.tipo ? (
                  <Text style={{ color: c.textoSuave, textTransform: 'capitalize' }}>
                    {item.tipo}
                  </Text>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacio.m,
    padding: espacio.l,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  saludo: { fontSize: 26, fontWeight: '800', flexShrink: 1 },
  botonSalir: {
    minHeight: ALTURA_TACTIL,
    paddingHorizontal: espacio.m,
    borderWidth: 1.5,
    borderRadius: radio.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seccion: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: espacio.l,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  lista: {
    padding: espacio.l,
    gap: espacio.s,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  tarjeta: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    padding: espacio.m,
    borderWidth: 1,
    borderRadius: radio.l,
  },
  punto: { width: 12, height: 12, borderRadius: 6 },
  nombreEspacio: { fontSize: 17, fontWeight: '700' },
  error: { marginBottom: espacio.m },
});
