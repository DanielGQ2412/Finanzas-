import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  mensajeError,
  obtenerCarpetas,
  obtenerEspacioPersonal,
  obtenerMovimientosMes,
  resumenMes,
  totalesPorCarpeta,
  type Carpeta,
  type Movimiento,
} from '@/lib/finanzas';
import { colones, fechaCorta, nombreMes } from '@/lib/formato';
import { useMes } from '@/lib/mes';
import { useSesion } from '@/lib/sesion';
import { supabase } from '@/lib/supabase';
import { ALTURA_TACTIL, espacio, radio, useTema, type Colores } from '@/lib/tema';
import { ANCHO_MAX, BarraPresupuesto, CajaError, SelectorMes } from '@/lib/ui';

const ETIQUETA_TIPO: Record<string, string> = {
  fijo: 'Fijo',
  variable: 'Variable',
  ahorro: 'Ahorro',
  inversion: 'Inversión',
  emergencia: 'Emergencia',
  imprevisto: 'Imprevisto',
  ingreso: 'Ingreso',
  gasto: 'Gasto',
  transferencia: 'Transferencia',
  reembolso: 'Reembolso',
};

const MAX_ULTIMOS = 10;

export default function Inicio() {
  const c = useTema();
  const insets = useSafeAreaInsets();
  const { sesion, cerrarSesion } = useSesion();
  const usuarioId = sesion?.user.id;

  const { mes, cambiarMes: moverMes } = useMes();
  const [nombre, setNombre] = useState<string | null>(null);
  const [espacioId, setEspacioId] = useState<string | null>(null);
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pedido = useRef(0);

  const cargar = useCallback(async () => {
    if (!usuarioId) return;
    const este = ++pedido.current;
    try {
      const [perfil, idEspacio] = await Promise.all([
        supabase.from('perfiles').select('nombre').eq('id', usuarioId).maybeSingle(),
        obtenerEspacioPersonal(usuarioId),
      ]);
      if (!idEspacio) {
        if (este !== pedido.current) return;
        setError('No encontramos tu espacio Personal. Escribinos para revisarlo.');
        return;
      }
      const [listaCarpetas, listaMovs] = await Promise.all([
        obtenerCarpetas(idEspacio),
        obtenerMovimientosMes(idEspacio, mes),
      ]);
      if (este !== pedido.current) return; // llegó una respuesta más nueva
      setNombre((perfil.data?.nombre as string | undefined) ?? null);
      setEspacioId(idEspacio);
      setCarpetas(listaCarpetas);
      setMovs(listaMovs);
      setError(null);
    } catch (e) {
      if (este !== pedido.current) return;
      setError(mensajeError(e as { message?: string }, 'cargar tus datos') + ' Deslizá hacia abajo para reintentar.');
    } finally {
      if (este === pedido.current) setCargando(false);
    }
  }, [usuarioId, mes]);

  // Recarga al entrar a la pantalla, al volver de "Agregar" y al cambiar de mes.
  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const refrescar = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  const cambiarMes = (delta: number) => {
    setCargando(true);
    moverMes(delta);
  };

  const resumen = resumenMes(movs);
  const porCarpeta = totalesPorCarpeta(movs);
  const nombreCarpeta = new Map(carpetas.map((k) => [k.id, k.nombre]));
  const ultimos = movs.slice(0, MAX_ULTIMOS);
  const saludo = nombre ?? sesion?.user.email ?? '';

  return (
    <SafeAreaView style={[styles.pantalla, { backgroundColor: c.fondo }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.contenido, { paddingBottom: 96 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.primario} />
        }>
        {/* Encabezado */}
        <View style={styles.encabezado}>
          <Text style={[styles.saludo, { color: c.texto }]} numberOfLines={1}>
            Hola, {saludo}
          </Text>
          <Pressable
            onPress={cerrarSesion}
            style={({ pressed }) => [styles.botonSalir, { borderColor: c.primario, opacity: pressed ? 0.7 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión">
            <Text style={{ color: c.primario, fontWeight: '700' }}>Cerrar sesión</Text>
          </Pressable>
        </View>

        {/* Selector de mes */}
        <SelectorMes c={c} mes={mes} onCambiar={cambiarMes} />
        <CajaError c={c} texto={error} />

        {cargando && !espacioId ? (
          <ActivityIndicator color={c.primario} size="large" style={{ marginTop: espacio.xl }} />
        ) : (
          <>
            {/* Tarjeta: disponible para asignar */}
            <View style={[styles.tarjeta, { backgroundColor: c.tarjeta }]}>
              <Text style={[styles.tarjetaTitulo, { color: c.sobreTarjetaSuave }]}>Disponible para asignar</Text>
              <Text
                style={[styles.tarjetaMonto, { color: resumen.disponible >= 0 ? c.menta : '#FF8FA3' }]}
                numberOfLines={1}
                adjustsFontSizeToFit>
                {colones(resumen.disponible)}
              </Text>
              {cargando ? <ActivityIndicator color={c.sobreTarjeta} style={styles.tarjetaCargando} /> : null}
              <View style={styles.tarjetaFila}>
                <Dato c={c} titulo="Ingresos" monto={resumen.ingresos} />
                <Dato c={c} titulo="Gastos" monto={resumen.gastos} />
                <Dato c={c} titulo="Ahorros" monto={resumen.ahorros} />
                {resumen.inversiones > 0 ? <Dato c={c} titulo="Inversiones" monto={resumen.inversiones} /> : null}
              </View>
            </View>

            {/* Carpetas */}
            <Text style={[styles.seccion, { color: c.textoSuave }]}>Carpetas</Text>
            {carpetas.length === 0 ? (
              <Text style={{ color: c.textoSuave }}>Todavía no tenés carpetas.</Text>
            ) : (
              <View style={[styles.grupo, { backgroundColor: c.superficie, borderColor: c.borde }]}>
                {carpetas.map((k, i) => (
                  <FilaCarpeta key={k.id} c={c} carpeta={k} gastado={porCarpeta.get(k.id) ?? 0} primera={i === 0} />
                ))}
              </View>
            )}

            {/* Últimos movimientos */}
            <Text style={[styles.seccion, { color: c.textoSuave }]}>Últimos movimientos</Text>
            {ultimos.length === 0 ? (
              <Text style={{ color: c.textoSuave }}>
                No hay movimientos en {nombreMes(mes).toLowerCase()}. Tocá + para agregar uno.
              </Text>
            ) : (
              <View style={[styles.grupo, { backgroundColor: c.superficie, borderColor: c.borde }]}>
                {ultimos.map((m, i) => (
                  <FilaMovimiento
                    key={m.id}
                    c={c}
                    mov={m}
                    titulo={(m.carpeta_id && nombreCarpeta.get(m.carpeta_id)) || ETIQUETA_TIPO[m.tipo] || m.tipo}
                    primera={i === 0}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Botón flotante */}
      <View pointerEvents="box-none" style={[styles.capaFab, { bottom: espacio.l + insets.bottom }]}>
        <View pointerEvents="box-none" style={styles.anchoFab}>
          <Pressable
            onPress={() => router.push('/agregar')}
            disabled={!espacioId}
            style={({ pressed }) => [
              styles.fab,
              { backgroundColor: c.primario, opacity: !espacioId ? 0.5 : pressed ? 0.85 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Agregar movimiento">
            <Text style={[styles.fabTexto, { color: c.sobrePrimario }]}>+</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Dato({ c, titulo, monto }: { c: Colores; titulo: string; monto: number }) {
  return (
    <View style={styles.dato}>
      <Text style={{ color: c.sobreTarjetaSuave, fontSize: 13 }}>{titulo}</Text>
      <Text style={{ color: c.sobreTarjeta, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
        {colones(monto)}
      </Text>
    </View>
  );
}

function FilaCarpeta({ c, carpeta, gastado, primera }: { c: Colores; carpeta: Carpeta; gastado: number; primera: boolean }) {
  const tope = carpeta.presupuesto_mensual;
  const tienePresupuesto = tope != null && tope > 0;
  const excedido = tienePresupuesto && gastado > tope;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/carpeta/[id]', params: { id: carpeta.id } })}
      style={({ pressed }) => [
        styles.fila,
        !primera && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.borde },
        pressed && { backgroundColor: c.borde },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${carpeta.nombre}, ${colones(gastado)} gastado${tienePresupuesto ? ` de ${colones(tope)}` : ''}. Ver detalle`}>
      <View style={styles.filaArriba}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.filaTitulo, { color: c.texto }]}>{carpeta.nombre}</Text>
          <Text style={{ color: c.textoSuave, fontSize: 13 }}>{ETIQUETA_TIPO[carpeta.tipo] ?? carpeta.tipo}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.filaMonto, { color: excedido ? c.error : c.texto }]}>{colones(gastado)}</Text>
          {tienePresupuesto ? (
            <Text style={{ color: c.textoSuave, fontSize: 13 }}>de {colones(tope)}</Text>
          ) : null}
        </View>
        <Text style={{ color: c.textoSuave, fontSize: 22 }}>›</Text>
      </View>
      {tienePresupuesto ? <BarraPresupuesto c={c} gastado={gastado} tope={tope} /> : null}
    </Pressable>
  );
}

function FilaMovimiento({ c, mov, titulo, primera }: { c: Colores; mov: Movimiento; titulo: string; primera: boolean }) {
  const entra = mov.tipo === 'ingreso' || mov.tipo === 'reembolso';
  const detalle = [fechaCorta(mov.fecha), ETIQUETA_TIPO[mov.tipo] ?? mov.tipo, mov.descripcion]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={[
        styles.fila,
        styles.filaArriba,
        !primera && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.borde },
      ]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.filaTitulo, { color: c.texto }]} numberOfLines={1}>
          {titulo}
        </Text>
        <Text style={{ color: c.textoSuave, fontSize: 13 }} numberOfLines={1}>
          {detalle}
        </Text>
      </View>
      <Text style={[styles.filaMonto, { color: entra ? c.positivo : c.texto }]}>
        {entra ? '+' : '−'}
        {colones(mov.monto)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  contenido: {
    padding: espacio.l,
    gap: espacio.m,
    width: '100%',
    maxWidth: ANCHO_MAX,
    alignSelf: 'center',
  },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espacio.m },
  saludo: { fontSize: 26, fontWeight: '800', flexShrink: 1 },
  botonSalir: {
    minHeight: ALTURA_TACTIL,
    paddingHorizontal: espacio.m,
    borderWidth: 1.5,
    borderRadius: radio.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tarjeta: { borderRadius: radio.l, padding: espacio.l, gap: espacio.s },
  tarjetaTitulo: { fontSize: 15, fontWeight: '600' },
  tarjetaMonto: { fontSize: 40, fontWeight: '800' },
  tarjetaCargando: { position: 'absolute', top: espacio.l, right: espacio.l },
  tarjetaFila: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.m, marginTop: espacio.s },
  dato: { minWidth: 96, flexGrow: 1 },
  seccion: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: espacio.s,
  },
  grupo: { borderWidth: 1, borderRadius: radio.l, overflow: 'hidden' },
  fila: { minHeight: 64, paddingHorizontal: espacio.m, paddingVertical: espacio.m - 4, justifyContent: 'center', gap: espacio.s },
  filaArriba: { flexDirection: 'row', alignItems: 'center', gap: espacio.m },
  filaTitulo: { fontSize: 16, fontWeight: '700' },
  filaMonto: { fontSize: 16, fontWeight: '700' },
  capaFab: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  anchoFab: { width: '100%', maxWidth: ANCHO_MAX, alignItems: 'flex-end', paddingHorizontal: espacio.l },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(16, 0, 43, 0.3)',
  },
  fabTexto: { fontSize: 34, fontWeight: '600', lineHeight: 38 },
});
