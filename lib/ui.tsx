/** Componentes visuales compartidos entre pantallas. */
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colones, nombreMes, type Mes } from './formato';
import { ALTURA_TACTIL, espacio, radio, type Colores } from './tema';

export const ANCHO_MAX = 720;

export function Chip({ c, texto, activo, onPress }: { c: Colores; texto: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        ui.chip,
        {
          backgroundColor: activo ? c.primario : c.superficie,
          borderColor: activo ? c.primario : c.borde,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}>
      <Text style={{ color: activo ? c.sobrePrimario : c.texto, fontWeight: '600', fontSize: 15 }}>{texto}</Text>
    </Pressable>
  );
}

export function BotonCuadrado({ c, texto, etiqueta, onPress }: { c: Colores; texto: string; etiqueta: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [ui.cuadrado, { backgroundColor: c.superficie, borderColor: c.borde, opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}>
      <Text style={{ color: c.primario, fontSize: 28, fontWeight: '700', lineHeight: 32 }}>{texto}</Text>
    </Pressable>
  );
}

export function SelectorMes({ c, mes, onCambiar }: { c: Colores; mes: Mes; onCambiar: (delta: number) => void }) {
  return (
    <View style={ui.selectorMes}>
      <BotonCuadrado c={c} texto="‹" etiqueta="Mes anterior" onPress={() => onCambiar(-1)} />
      <Text style={{ color: c.texto, fontSize: 20, fontWeight: '700' }}>{nombreMes(mes)}</Text>
      <BotonCuadrado c={c} texto="›" etiqueta="Mes siguiente" onPress={() => onCambiar(1)} />
    </View>
  );
}

export function CajaError({ c, texto }: { c: Colores; texto: string | null }) {
  if (!texto) return null;
  return (
    <View style={[ui.cajaError, { borderColor: c.error }]} accessibilityRole="alert">
      <Text style={{ color: c.error }}>{texto}</Text>
    </View>
  );
}

export function Etiqueta({ c, texto }: { c: Colores; texto: string }) {
  return <Text style={[ui.etiqueta, { color: c.textoSuave }]}>{texto}</Text>;
}

export function BotonPrincipal({
  c, texto, onPress, ocupado = false, deshabilitado = false, variante = 'lleno',
}: {
  c: Colores; texto: string; onPress: () => void; ocupado?: boolean; deshabilitado?: boolean;
  variante?: 'lleno' | 'borde' | 'peligro';
}) {
  const off = ocupado || deshabilitado;
  const fondo = variante === 'lleno' ? c.primario : 'transparent';
  const color = variante === 'lleno' ? c.sobrePrimario : variante === 'peligro' ? c.error : c.primario;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        ui.botonPrincipal,
        { backgroundColor: fondo, borderColor: variante === 'peligro' ? c.error : c.primario, opacity: off ? 0.6 : pressed ? 0.85 : 1 },
      ]}
      accessibilityRole="button">
      {ocupado ? <ActivityIndicator color={color} /> : <Text style={{ color, fontSize: 17, fontWeight: '700' }}>{texto}</Text>}
    </Pressable>
  );
}

/** Estado de una carpeta respecto a su presupuesto. */
export function estadoPresupuesto(gastado: number, tope: number) {
  const proporcion = gastado / tope;
  const excedido = gastado > tope;
  return {
    proporcion,
    excedido,
    exceso: excedido ? gastado - tope : 0,
    nivel: excedido ? ('excedido' as const) : proporcion >= 0.9 ? ('cerca' as const) : ('bien' as const),
  };
}

/**
 * Barra de presupuesto: menta < 90 %, morada 90–100 %, color de error y llena si se pasa.
 * Cuando se pasa, muestra el texto "Te pasaste ₡X" (no depende solo del color).
 */
export function BarraPresupuesto({ c, gastado, tope }: { c: Colores; gastado: number; tope: number }) {
  const e = estadoPresupuesto(gastado, tope);
  const color = e.nivel === 'excedido' ? c.error : e.nivel === 'cerca' ? c.primario : c.menta;
  const pct = Math.round(e.proporcion * 100);
  return (
    <View style={{ gap: espacio.xs }}>
      <View
        style={[ui.barra, { backgroundColor: c.borde }]}
        accessibilityRole="progressbar"
        accessibilityLabel={e.excedido ? `Te pasaste ${colones(e.exceso)}` : `${pct} % del presupuesto`}
        accessibilityValue={{ min: 0, max: 100, now: Math.min(pct, 100) }}>
        <View style={[ui.barraRelleno, { width: `${Math.min(e.proporcion, 1) * 100}%`, backgroundColor: color }]} />
      </View>
      {e.excedido ? (
        <Text style={{ color: c.error, fontSize: 13, fontWeight: '700' }}>⚠ Te pasaste {colones(e.exceso)}</Text>
      ) : (
        <Text style={{ color: c.textoSuave, fontSize: 13 }}>
          {pct} % usado{e.nivel === 'cerca' ? ' · casi al límite' : ''}
        </Text>
      )}
    </View>
  );
}

/** Barra simple de progreso (0–1). */
export function BarraProgreso({ c, valor, color, alto = 8 }: { c: Colores; valor: number; color: string; alto?: number }) {
  const v = Math.max(0, Math.min(valor, 1));
  return (
    <View
      style={[ui.barra, { height: alto, backgroundColor: c.borde }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}>
      <View style={[ui.barraRelleno, { width: `${v * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

/** Contenedor con borde redondeado para listas. */
export function Grupo({ c, children }: { c: Colores; children: ReactNode }) {
  return <View style={[ui.grupo, { backgroundColor: c.superficie, borderColor: c.borde }]}>{children}</View>;
}

export const ui = StyleSheet.create({
  contenido: {
    padding: espacio.l,
    gap: espacio.m,
    width: '100%',
    maxWidth: ANCHO_MAX,
    alignSelf: 'center',
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: espacio.m,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuadrado: {
    width: ALTURA_TACTIL,
    height: ALTURA_TACTIL,
    borderRadius: radio.m,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorMes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cajaError: { borderWidth: 1.5, borderRadius: radio.m, padding: espacio.m },
  etiqueta: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: espacio.s },
  botonPrincipal: {
    minHeight: 52,
    borderRadius: radio.m,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacio.m,
  },
  barra: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barraRelleno: { height: '100%', borderRadius: 4 },
  grupo: { borderWidth: 1, borderRadius: radio.l, overflow: 'hidden' },
  campo: {
    minHeight: ALTURA_TACTIL,
    borderWidth: 1,
    borderRadius: radio.m,
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.s,
    fontSize: 16,
  },
  encabezadoModal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  botonTexto: { minHeight: ALTURA_TACTIL, minWidth: 80, justifyContent: 'center' },
});
