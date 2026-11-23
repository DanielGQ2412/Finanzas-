import { router } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ALTURA_TACTIL, espacio, radio, useTema, type Colores } from '@/lib/tema';

/** Más de este ancho se usa barra lateral (PC); menos, barra inferior (teléfono). */
const ANCHO_LATERAL = 900;

const SECCIONES = [
  { name: 'inicio', href: '/inicio', texto: 'Inicio', icono: '⌂' },
  { name: 'fijos', href: '/fijos', texto: 'Gastos fijos', icono: '☑' },
] as const;

export default function LayoutPestanas() {
  const c = useTema();
  const { width } = useWindowDimensions();
  const lateral = width > ANCHO_LATERAL;

  return (
    <Tabs style={{ flex: 1, flexDirection: lateral ? 'row' : 'column', backgroundColor: c.fondo }}>
      {lateral ? <BarraLateral c={c} /> : null}
      <TabSlot style={{ flex: 1 }} />
      {!lateral ? <BarraInferior c={c} /> : null}

      {/* Define las rutas de las pestañas; los botones visibles son los de arriba. */}
      <TabList style={{ display: 'none' }}>
        {SECCIONES.map((s) => (
          <TabTrigger key={s.name} name={s.name} href={s.href} />
        ))}
      </TabList>
    </Tabs>
  );
}

function BarraInferior({ c }: { c: Colores }) {
  const insets = useSafeAreaInsets();
  const [inicio, fijos] = SECCIONES;
  return (
    <View
      style={[styles.inferior, { backgroundColor: c.fondo, borderTopColor: c.borde, paddingBottom: Math.max(insets.bottom, espacio.s) }]}
      accessibilityRole="tablist">
      <TabTrigger name={inicio.name} asChild>
        <BotonPestana c={c} texto={inicio.texto} icono={inicio.icono} />
      </TabTrigger>
      <View style={styles.centro}>
        <Pressable
          onPress={() => router.push('/agregar')}
          style={({ pressed }) => [styles.mas, { backgroundColor: c.primario, opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Agregar movimiento">
          <Text style={[styles.masTexto, { color: c.sobrePrimario }]}>+</Text>
        </Pressable>
      </View>
      <TabTrigger name={fijos.name} asChild>
        <BotonPestana c={c} texto={fijos.texto} icono={fijos.icono} />
      </TabTrigger>
    </View>
  );
}

function BarraLateral({ c }: { c: Colores }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.lateral, { backgroundColor: c.superficie, borderRightColor: c.borde, paddingTop: insets.top + espacio.l }]}>
      <Text style={[styles.marca, { color: c.primario }]}>Finanzas</Text>
      <Pressable
        onPress={() => router.push('/agregar')}
        style={({ pressed }) => [styles.agregarLateral, { backgroundColor: c.primario, opacity: pressed ? 0.85 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel="Agregar movimiento">
        <Text style={{ color: c.sobrePrimario, fontSize: 16, fontWeight: '700' }}>+ Agregar</Text>
      </Pressable>
      {SECCIONES.map((s) => (
        <TabTrigger key={s.name} name={s.name} asChild>
          <BotonPestana c={c} texto={s.texto} icono={s.icono} horizontal />
        </TabTrigger>
      ))}
    </View>
  );
}

function BotonPestana({
  c, texto, icono, horizontal = false, isFocused, ref: _ref, ...props
}: TabTriggerSlotProps & { c: Colores; texto: string; icono: string; horizontal?: boolean }) {
  const color = isFocused ? c.primario : c.textoSuave;
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        horizontal ? styles.itemLateral : styles.itemInferior,
        horizontal && isFocused && { backgroundColor: c.fondo },
        { opacity: pressed ? 0.7 : 1 },
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={texto}>
      <Text style={{ color, fontSize: horizontal ? 20 : 22 }}>{icono}</Text>
      <Text style={{ color, fontSize: horizontal ? 16 : 12, fontWeight: isFocused ? '800' : '600' }}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inferior: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: espacio.xs,
  },
  itemInferior: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 2 },
  centro: { width: 88, alignItems: 'center' },
  mas: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    boxShadow: '0 4px 12px rgba(16, 0, 43, 0.3)',
  },
  masTexto: { fontSize: 34, fontWeight: '600', lineHeight: 38 },
  lateral: { width: 240, borderRightWidth: StyleSheet.hairlineWidth, paddingHorizontal: espacio.m, gap: espacio.s },
  marca: { fontSize: 22, fontWeight: '800', paddingHorizontal: espacio.s, marginBottom: espacio.m },
  agregarLateral: {
    minHeight: ALTURA_TACTIL,
    borderRadius: radio.m,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacio.m,
  },
  itemLateral: {
    minHeight: ALTURA_TACTIL,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    paddingHorizontal: espacio.m,
    borderRadius: radio.m,
  },
});
