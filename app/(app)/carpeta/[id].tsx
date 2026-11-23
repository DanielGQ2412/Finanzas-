import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  guardarPresupuesto,
  mensajeError,
  obtenerCarpeta,
  obtenerEspacioPersonal,
  obtenerMovimientosMes,
  totalesPorCarpeta,
  type Carpeta,
  type Movimiento,
} from '@/lib/finanzas';
import { colones, fechaCorta, leerMonto, nombreMes } from '@/lib/formato';
import { useMes } from '@/lib/mes';
import { useSesion } from '@/lib/sesion';
import { espacio, useTema } from '@/lib/tema';
import { BarraPresupuesto, BotonPrincipal, CajaError, Etiqueta, Grupo, SelectorMes, ui } from '@/lib/ui';

function volver() {
  if (router.canGoBack()) router.back();
  else router.replace('/inicio');
}

export default function DetalleCarpeta() {
  const c = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sesion } = useSesion();
  const usuarioId = sesion?.user.id;
  const { mes, cambiarMes } = useMes();

  const [carpeta, setCarpeta] = useState<Carpeta | null>(null);
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [presupuesto, setPresupuesto] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const pedido = useRef(0);
  const carpetaCargada = useRef(false);

  const cargar = useCallback(async () => {
    if (!usuarioId || !id) return;
    const este = ++pedido.current;
    try {
      const [k, espacioId] = await Promise.all([obtenerCarpeta(id), obtenerEspacioPersonal(usuarioId)]);
      if (!k || !espacioId) throw new Error('no encontrada');
      const lista = await obtenerMovimientosMes(espacioId, mes, id);
      if (este !== pedido.current) return;
      setCarpeta(k);
      setPresupuesto((p) => (carpetaCargada.current ? p : k.presupuesto_mensual ?? 0));
      carpetaCargada.current = true;
      setMovs(lista);
      setError(null);
    } catch (e) {
      if (este === pedido.current) setError(mensajeError(e as { message?: string }, 'cargar la carpeta'));
    } finally {
      if (este === pedido.current) setCargando(false);
    }
  }, [usuarioId, id, mes]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = async () => {
    if (!carpeta) return;
    setGuardando(true);
    setAviso(null);
    setError(null);
    const valor = presupuesto > 0 ? presupuesto : null;
    try {
      await guardarPresupuesto(carpeta.id, valor);
      setCarpeta({ ...carpeta, presupuesto_mensual: valor });
      setAviso(valor ? `Presupuesto guardado: ${colones(valor)} al mes.` : 'Listo: esta carpeta no tiene límite.');
    } catch (e) {
      setError(mensajeError(e as { message?: string; code?: string }, 'guardar el presupuesto'));
    } finally {
      setGuardando(false);
    }
  };

  const gastado = carpeta ? totalesPorCarpeta(movs).get(carpeta.id) ?? 0 : 0;
  const tope = carpeta?.presupuesto_mensual ?? null;
  const cambioSinGuardar = (presupuesto > 0 ? presupuesto : null) !== tope;

  return (
    <SafeAreaView style={[styles.pantalla, { backgroundColor: c.fondo }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={ui.contenido} keyboardShouldPersistTaps="handled">
          <View style={ui.encabezadoModal}>
            <Pressable onPress={volver} style={ui.botonTexto} accessibilityRole="button" accessibilityLabel="Volver">
              <Text style={{ color: c.primario, fontSize: 16, fontWeight: '600' }}>‹ Volver</Text>
            </Pressable>
          </View>

          {cargando && !carpeta ? (
            <ActivityIndicator color={c.primario} size="large" style={{ marginTop: espacio.xl }} />
          ) : !carpeta ? (
            <CajaError c={c} texto={error ?? 'No encontramos esta carpeta.'} />
          ) : (
            <>
              <Text style={[styles.titulo, { color: c.texto }]}>{carpeta.nombre}</Text>
              <SelectorMes c={c} mes={mes} onCambiar={cambiarMes} />

              <View style={[styles.resumen, { backgroundColor: c.superficie, borderColor: c.borde }]}>
                <Text style={{ color: c.textoSuave, fontSize: 15 }}>Gastado en {nombreMes(mes).toLowerCase()}</Text>
                <Text style={[styles.monto, { color: c.texto }]}>{colones(gastado)}</Text>
                {tope ? (
                  <>
                    <Text style={{ color: c.textoSuave }}>de {colones(tope)}</Text>
                    <BarraPresupuesto c={c} gastado={gastado} tope={tope} />
                  </>
                ) : (
                  <Text style={{ color: c.textoSuave }}>Sin límite mensual</Text>
                )}
              </View>

              <Etiqueta c={c} texto="Presupuesto mensual" />
              <View style={styles.filaPresupuesto}>
                <View style={[ui.campo, styles.campoMonto, { backgroundColor: c.superficie, borderColor: c.borde }]}>
                  <Text style={{ color: c.texto, fontSize: 18, fontWeight: '700' }}>₡</Text>
                  <TextInput
                    value={presupuesto > 0 ? colones(presupuesto).slice(1) : ''}
                    onChangeText={(t) => {
                      setPresupuesto(leerMonto(t));
                      setAviso(null);
                    }}
                    placeholder="Sin límite"
                    placeholderTextColor={c.textoSuave}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    style={{ flex: 1, color: c.texto, fontSize: 18, fontWeight: '700', minHeight: 44 }}
                    accessibilityLabel="Presupuesto mensual en colones"
                  />
                </View>
              </View>
              <Text style={{ color: c.textoSuave, fontSize: 13 }}>Dejalo vacío para no poner límite.</Text>
              <BotonPrincipal c={c} texto="Guardar presupuesto" onPress={guardar} ocupado={guardando} deshabilitado={!cambioSinGuardar} />
              {aviso ? <Text style={{ color: c.positivo, fontWeight: '600' }}>✓ {aviso}</Text> : null}
              <CajaError c={c} texto={error} />

              <Etiqueta c={c} texto="Movimientos del mes" />
              {movs.length === 0 ? (
                <Text style={{ color: c.textoSuave }}>No hay movimientos en esta carpeta este mes.</Text>
              ) : (
                <Grupo c={c}>
                  {movs.map((m, i) => (
                    <View
                      key={m.id}
                      style={[styles.fila, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.borde }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.texto, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
                          {m.descripcion || fechaCorta(m.fecha)}
                        </Text>
                        <Text style={{ color: c.textoSuave, fontSize: 13 }}>
                          {fechaCorta(m.fecha)}
                          {m.pagado ? '' : ' · pendiente'}
                        </Text>
                      </View>
                      <Text style={{ color: m.tipo === 'ingreso' ? c.positivo : c.texto, fontSize: 16, fontWeight: '700' }}>
                        {m.tipo === 'ingreso' ? '+' : '−'}
                        {colones(m.monto)}
                      </Text>
                    </View>
                  ))}
                </Grupo>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  titulo: { fontSize: 28, fontWeight: '800' },
  resumen: { borderWidth: 1, borderRadius: 16, padding: espacio.l, gap: espacio.xs },
  monto: { fontSize: 34, fontWeight: '800' },
  filaPresupuesto: { flexDirection: 'row', gap: espacio.s },
  campoMonto: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
  fila: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: espacio.m, paddingHorizontal: espacio.m, paddingVertical: espacio.s },
});
