import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mensajeError, obtenerCarpetas, obtenerEspacioPersonal, type Carpeta, type Prioridad } from '@/lib/finanzas';
import { desmarcarPagado, marcarPagado, obtenerPagosDelMes, obtenerPagosFijos, type PagoDelMes, type PagoFijo } from '@/lib/fijos';
import { colones, mesActual } from '@/lib/formato';
import { useMes } from '@/lib/mes';
import { useSesion } from '@/lib/sesion';
import { espacio, radio, useTema, type Colores } from '@/lib/tema';
import { BarraProgreso, BotonPrincipal, CajaError, Grupo, SelectorMes, ui } from '@/lib/ui';

const ETIQUETA_PRIORIDAD: Record<Prioridad, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' };

type GrupoPagos = { id: string; nombre: string; carpetaId: string | null; pagos: PagoFijo[] };

export default function GastosFijos() {
  const c = useTema();
  const { sesion } = useSesion();
  const usuarioId = sesion?.user.id;
  const { mes, cambiarMes } = useMes();

  const [espacioId, setEspacioId] = useState<string | null>(null);
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [pagos, setPagos] = useState<PagoFijo[]>([]);
  const [pagadosMes, setPagadosMes] = useState<Map<string, PagoDelMes>>(new Map());
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cerradas, setCerradas] = useState<Set<string>>(new Set(['__inactivos']));
  const [ocupados, setOcupados] = useState<Set<string>>(new Set());
  const pedido = useRef(0);

  const cargar = useCallback(async () => {
    if (!usuarioId) return;
    const este = ++pedido.current;
    try {
      const id = await obtenerEspacioPersonal(usuarioId);
      if (!id) throw new Error('sin espacio personal');
      const [listaCarpetas, listaPagos, pagados] = await Promise.all([
        obtenerCarpetas(id),
        obtenerPagosFijos(id),
        obtenerPagosDelMes(id, mes),
      ]);
      if (este !== pedido.current) return;
      setEspacioId(id);
      setCarpetas(listaCarpetas);
      setPagos(listaPagos);
      setPagadosMes(pagados);
      setError(null);
    } catch (e) {
      if (este === pedido.current) {
        setError(mensajeError(e as { message?: string }, 'cargar tus gastos fijos') + ' Deslizá hacia abajo para reintentar.');
      }
    } finally {
      if (este === pedido.current) setCargando(false);
    }
  }, [usuarioId, mes]);

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

  const alternarPagado = async (pago: PagoFijo) => {
    if (!espacioId || ocupados.has(pago.id)) return;
    const estabaPagado = pagadosMes.has(pago.id);
    setOcupados((s) => new Set(s).add(pago.id));
    setError(null);
    try {
      if (estabaPagado) await desmarcarPagado(pago.id, mes);
      else await marcarPagado(pago, espacioId, mes);
      const pagados = await obtenerPagosDelMes(espacioId, mes);
      setPagadosMes(pagados);
    } catch (e) {
      setError(mensajeError(e as { message?: string; code?: string }, estabaPagado ? 'desmarcar el pago' : 'marcar el pago'));
    } finally {
      setOcupados((s) => {
        const n = new Set(s);
        n.delete(pago.id);
        return n;
      });
    }
  };

  const alternarGrupo = (id: string) =>
    setCerradas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // Agrupar: una sección por carpeta tipo 'fijo'; pagos con otra carpeta van a "Otros pagos".
  const activos = pagos.filter((p) => p.activo);
  const inactivos = pagos.filter((p) => !p.activo);
  const fijas = carpetas.filter((k) => k.tipo === 'fijo');
  const idsFijas = new Set(fijas.map((k) => k.id));
  const grupos: GrupoPagos[] = fijas.map((k) => ({
    id: k.id,
    nombre: k.nombre,
    carpetaId: k.id,
    pagos: activos.filter((p) => p.carpeta_id === k.id),
  }));
  const otros = activos.filter((p) => !p.carpeta_id || !idsFijas.has(p.carpeta_id));
  if (otros.length > 0) grupos.push({ id: '__otros', nombre: 'Otros pagos', carpetaId: null, pagos: otros });

  const listos = activos.filter((p) => pagadosMes.has(p.id));
  const pagado = listos.reduce((t, p) => t + (pagadosMes.get(p.id)?.monto ?? p.monto), 0);
  const porPagar = activos.filter((p) => !pagadosMes.has(p.id)).reduce((t, p) => t + p.monto, 0);
  const esMesActual = mes.anio === mesActual().anio && mes.mes === mesActual().mes;
  const hoyDia = new Date().getDate();

  return (
    <SafeAreaView style={[styles.pantalla, { backgroundColor: c.fondo }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[ui.contenido, { paddingBottom: espacio.xl }]}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.primario} />}>
        <Text style={[styles.titulo, { color: c.texto }]}>Gastos fijos</Text>
        <SelectorMes c={c} mes={mes} onCambiar={cambiarMes} />
        <CajaError c={c} texto={error} />

        {cargando && !espacioId ? (
          <ActivityIndicator color={c.primario} size="large" style={{ marginTop: espacio.xl }} />
        ) : (
          <>
            {/* Resumen */}
            <View style={[styles.resumen, { backgroundColor: c.tarjeta }]}>
              <View style={styles.resumenFila}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.sobreTarjetaSuave, fontSize: 14 }}>Pagado</Text>
                  <Text style={[styles.resumenMonto, { color: c.menta }]}>{colones(pagado)}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={{ color: c.sobreTarjetaSuave, fontSize: 14 }}>Por pagar</Text>
                  <Text style={[styles.resumenMonto, { color: c.sobreTarjeta }]}>{colones(porPagar)}</Text>
                </View>
              </View>
              <BarraProgreso c={c} valor={activos.length ? listos.length / activos.length : 0} color={c.menta} alto={10} />
              <Text style={{ color: c.sobreTarjeta, fontWeight: '700' }}>
                {listos.length} de {activos.length} listos
              </Text>
            </View>

            {fijas.length === 0 && otros.length === 0 ? (
              <Text style={{ color: c.textoSuave }}>
                Todavía no tenés carpetas de gastos fijos. Creá una con &quot;Nueva carpeta&quot;.
              </Text>
            ) : null}

            {grupos.map((g) => {
              const abierto = !cerradas.has(g.id);
              const total = g.pagos.reduce((t, p) => t + p.monto, 0);
              const n = g.pagos.length;
              return (
                <Grupo key={g.id} c={c}>
                  <Pressable
                    onPress={() => alternarGrupo(g.id)}
                    style={({ pressed }) => [styles.cabeceraGrupo, pressed && { backgroundColor: c.borde }]}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: abierto }}
                    accessibilityLabel={`${g.nombre}, ${n} ${n === 1 ? 'pago' : 'pagos'}, ${colones(total)}`}>
                    <Text style={{ color: c.textoSuave, fontSize: 16, width: 16 }}>{abierto ? '▾' : '▸'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.nombreGrupo, { color: c.texto }]}>{g.nombre}</Text>
                      <Text style={{ color: c.textoSuave, fontSize: 13 }}>
                        {n} {n === 1 ? 'pago' : 'pagos'}
                      </Text>
                    </View>
                    <Text style={[styles.monto, { color: c.texto }]}>{colones(total)}</Text>
                  </Pressable>

                  {abierto ? (
                    <>
                      {g.pagos.map((p) => (
                        <FilaPago
                          key={p.id}
                          c={c}
                          pago={p}
                          pagado={pagadosMes.has(p.id)}
                          ocupado={ocupados.has(p.id)}
                          vencido={esMesActual && p.dia_pago != null && p.dia_pago < hoyDia}
                          onAlternar={() => alternarPagado(p)}
                        />
                      ))}
                      {g.carpetaId ? (
                        <Pressable
                          onPress={() => router.push({ pathname: '/pago-fijo', params: { carpetaId: g.carpetaId! } })}
                          style={({ pressed }) => [styles.anadir, { borderTopColor: c.borde, opacity: pressed ? 0.7 : 1 }]}
                          accessibilityRole="button"
                          accessibilityLabel={`Añadir pago en ${g.nombre}`}>
                          <Text style={{ color: c.primario, fontWeight: '700', fontSize: 15 }}>+ Añadir pago</Text>
                        </Pressable>
                      ) : null}
                    </>
                  ) : null}
                </Grupo>
              );
            })}

            {inactivos.length > 0 ? (
              <Grupo c={c}>
                <Pressable
                  onPress={() => alternarGrupo('__inactivos')}
                  style={styles.cabeceraGrupo}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: !cerradas.has('__inactivos') }}>
                  <Text style={{ color: c.textoSuave, fontSize: 16, width: 16 }}>{cerradas.has('__inactivos') ? '▸' : '▾'}</Text>
                  <Text style={[styles.nombreGrupo, { color: c.textoSuave, flex: 1 }]}>Desactivados ({inactivos.length})</Text>
                </Pressable>
                {!cerradas.has('__inactivos')
                  ? inactivos.map((p) => (
                      <Pressable
                        key={p.id}
                        onPress={() => router.push({ pathname: '/pago-fijo', params: { id: p.id } })}
                        style={[styles.filaPago, { borderTopColor: c.borde }]}
                        accessibilityRole="button"
                        accessibilityLabel={`${p.nombre}, desactivado. Editar`}>
                        <Text style={{ color: c.textoSuave, flex: 1, fontSize: 16 }}>{p.nombre}</Text>
                        <Text style={{ color: c.textoSuave }}>{colones(p.monto)}</Text>
                      </Pressable>
                    ))
                  : null}
              </Grupo>
            ) : null}

            <BotonPrincipal c={c} texto="+ Nueva carpeta" variante="borde" onPress={() => router.push('/nueva-carpeta')} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilaPago({
  c, pago, pagado, ocupado, vencido, onAlternar,
}: { c: Colores; pago: PagoFijo; pagado: boolean; ocupado: boolean; vencido: boolean; onAlternar: () => void }) {
  const estado = pagado
    ? 'Pagado'
    : pago.dia_pago == null
      ? 'Sin día fijo'
      : vencido
        ? `Venció el día ${pago.dia_pago}`
        : `Vence el día ${pago.dia_pago}`;
  const colorEstado = pagado ? c.positivo : vencido ? c.error : c.textoSuave;

  return (
    <View style={[styles.filaPago, { borderTopColor: c.borde }]}>
      <Pressable
        onPress={onAlternar}
        disabled={ocupado}
        hitSlop={4}
        style={styles.casillaArea}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: pagado, busy: ocupado }}
        accessibilityLabel={`${pago.nombre}: ${pagado ? 'pagado' : 'sin pagar'}`}>
        {ocupado ? (
          <ActivityIndicator color={c.primario} />
        ) : (
          <View
            style={[
              styles.casilla,
              { borderColor: pagado ? c.positivo : c.textoSuave, backgroundColor: pagado ? c.positivo : 'transparent' },
            ]}>
            {pagado ? <Text style={styles.check}>✓</Text> : null}
          </View>
        )}
      </Pressable>
      <Pressable
        onPress={() => router.push({ pathname: '/pago-fijo', params: { id: pago.id } })}
        style={({ pressed }) => [styles.cuerpoPago, { opacity: pressed ? 0.7 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={`Editar ${pago.nombre}`}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={[styles.nombrePago, { color: c.texto }, pagado && { textDecorationLine: 'line-through', color: c.textoSuave }]}
            numberOfLines={1}>
            {pago.nombre}
          </Text>
          <View style={styles.lineaEstado}>
            <Text style={{ color: colorEstado, fontSize: 13, fontWeight: pagado || vencido ? '700' : '400' }}>
              {pagado ? '✓ ' : vencido ? '⚠ ' : ''}
              {estado}
            </Text>
            <EtiquetaPrioridad c={c} prioridad={pago.prioridad} />
          </View>
        </View>
        <Text style={[styles.monto, { color: c.texto }]}>{colones(pago.monto)}</Text>
      </Pressable>
    </View>
  );
}

function EtiquetaPrioridad({ c, prioridad }: { c: Colores; prioridad: Prioridad }) {
  const color = prioridad === 'alta' ? c.error : prioridad === 'media' ? c.primario : c.textoSuave;
  return (
    <View style={[styles.prioridad, { borderColor: color }]}>
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{ETIQUETA_PRIORIDAD[prioridad]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  titulo: { fontSize: 28, fontWeight: '800' },
  resumen: { borderRadius: radio.l, padding: espacio.l, gap: espacio.s },
  resumenFila: { flexDirection: 'row', gap: espacio.m },
  resumenMonto: { fontSize: 26, fontWeight: '800' },
  cabeceraGrupo: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: espacio.s, paddingHorizontal: espacio.m },
  nombreGrupo: { fontSize: 17, fontWeight: '800' },
  monto: { fontSize: 16, fontWeight: '700' },
  filaPago: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingRight: espacio.m,
    paddingLeft: espacio.xs,
  },
  casillaArea: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  casilla: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  check: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', lineHeight: 18 },
  cuerpoPago: { flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: espacio.m, paddingLeft: espacio.xs },
  nombrePago: { fontSize: 16, fontWeight: '700' },
  lineaEstado: { flexDirection: 'row', alignItems: 'center', gap: espacio.s, flexWrap: 'wrap' },
  prioridad: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 1 },
  anadir: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth },
});
