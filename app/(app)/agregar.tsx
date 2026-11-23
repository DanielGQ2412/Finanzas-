import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
  CARPETAS_POR_PESTANA,
  crearMovimiento,
  mensajeError,
  obtenerCarpetas,
  obtenerEspacioPersonal,
  type Carpeta,
  type Prioridad,
} from '@/lib/finanzas';
import { colones, fechaISO, fechaLarga, leerMonto, sumarDias } from '@/lib/formato';
import { useSesion } from '@/lib/sesion';
import { ALTURA_TACTIL, espacio, radio, useTema, type Colores } from '@/lib/tema';

type Pestana = 'gasto' | 'ingreso' | 'ahorro';

const PESTANAS: { valor: Pestana; texto: string }[] = [
  { valor: 'gasto', texto: 'Gasto' },
  { valor: 'ingreso', texto: 'Ingreso' },
  { valor: 'ahorro', texto: 'Ahorro' },
];

const PRIORIDADES: { valor: Prioridad; texto: string }[] = [
  { valor: 'alta', texto: 'Alta' },
  { valor: 'media', texto: 'Media' },
  { valor: 'baja', texto: 'Baja' },
];

function hoy(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function volver() {
  if (router.canGoBack()) router.back();
  else router.replace('/inicio');
}

export default function Agregar() {
  const c = useTema();
  const { sesion } = useSesion();
  const usuarioId = sesion?.user.id;

  const [espacioId, setEspacioId] = useState<string | null>(null);
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [cargando, setCargando] = useState(true);

  const [pestana, setPestana] = useState<Pestana>('gasto');
  const [monto, setMonto] = useState(0);
  const [carpetaId, setCarpetaId] = useState<string | null>(null);
  const [fecha, setFecha] = useState<Date>(hoy);
  const [prioridad, setPrioridad] = useState<Prioridad>('media');
  const [nota, setNota] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!usuarioId) return;
    let activo = true;
    (async () => {
      try {
        const id = await obtenerEspacioPersonal(usuarioId);
        if (!id) throw new Error('sin espacio personal');
        const lista = await obtenerCarpetas(id);
        if (!activo) return;
        setEspacioId(id);
        setCarpetas(lista);
      } catch (e) {
        if (activo) setError(mensajeError(e as { message?: string }, 'cargar tus carpetas'));
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [usuarioId]);

  const opciones = carpetas.filter((k) => CARPETAS_POR_PESTANA[pestana].includes(k.tipo));
  const categoriaObligatoria = pestana !== 'ingreso' && opciones.length > 0;

  const cambiarPestana = (p: Pestana) => {
    setPestana(p);
    setCarpetaId(null);
    setError(null);
  };

  const elegirCarpeta = (k: Carpeta) => {
    setCarpetaId(k.id);
    setPrioridad(k.prioridad); // sugiere la prioridad de la carpeta; se puede cambiar
    setError(null);
  };

  const guardar = async () => {
    if (monto <= 0) return setError('Escribí un monto mayor a cero.');
    if (categoriaObligatoria && !carpetaId) return setError('Elegí una categoría.');
    if (!espacioId) return setError('No encontramos tu espacio Personal.');

    setError(null);
    setGuardando(true);
    try {
      await crearMovimiento({
        espacio_id: espacioId,
        carpeta_id: carpetaId,
        tipo: pestana,
        monto,
        fecha: fechaISO(fecha),
        prioridad,
        descripcion: nota.trim() || null,
      });
      volver(); // Inicio recarga sus datos al volver a enfocarse.
    } catch (e) {
      setError(mensajeError(e as { message?: string; code?: string }, 'guardar el movimiento'));
      setGuardando(false);
    }
  };

  const esHoy = fechaISO(fecha) === fechaISO(hoy());

  return (
    <SafeAreaView style={[styles.pantalla, { backgroundColor: c.fondo }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
          {/* Encabezado */}
          <View style={styles.encabezado}>
            <Pressable
              onPress={volver}
              style={({ pressed }) => [styles.botonTexto, { opacity: pressed ? 0.6 : 1 }]}
              accessibilityRole="button">
              <Text style={{ color: c.primario, fontSize: 16, fontWeight: '600' }}>Cancelar</Text>
            </Pressable>
            <Text style={[styles.titulo, { color: c.texto }]}>Nuevo movimiento</Text>
            <View style={styles.botonTexto} />
          </View>

          {/* Pestañas */}
          <View style={[styles.segmentado, { backgroundColor: c.superficie, borderColor: c.borde }]} accessibilityRole="tablist">
            {PESTANAS.map((p) => {
              const activa = p.valor === pestana;
              return (
                <Pressable
                  key={p.valor}
                  onPress={() => cambiarPestana(p.valor)}
                  style={[styles.segmento, activa && { backgroundColor: c.primario }]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activa }}>
                  <Text style={{ color: activa ? c.sobrePrimario : c.texto, fontWeight: '700', fontSize: 16 }}>
                    {p.texto}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Monto */}
          <View style={styles.cajaMonto}>
            <Text style={[styles.simbolo, { color: pestana === 'ingreso' ? c.positivo : c.texto }]}>₡</Text>
            <TextInput
              value={monto > 0 ? colones(monto).slice(1) : ''}
              onChangeText={(t) => {
                setMonto(leerMonto(t));
                setError(null);
              }}
              placeholder="0"
              placeholderTextColor={c.textoSuave}
              keyboardType="number-pad"
              inputMode="numeric"
              autoFocus
              style={[styles.inputMonto, { color: pestana === 'ingreso' ? c.positivo : c.texto }]}
              accessibilityLabel="Monto en colones"
            />
          </View>

          {/* Categoría */}
          <Etiqueta c={c} texto={pestana === 'ingreso' ? 'Categoría (opcional)' : 'Categoría'} />
          {cargando ? (
            <ActivityIndicator color={c.primario} />
          ) : opciones.length === 0 ? (
            <Text style={{ color: c.textoSuave }}>
              {pestana === 'ingreso'
                ? 'Se guardará como ingreso sin categoría.'
                : 'No tenés carpetas de este tipo todavía.'}
            </Text>
          ) : (
            <View style={styles.chips}>
              {opciones.map((k) => (
                <Chip key={k.id} c={c} texto={k.nombre} activo={k.id === carpetaId} onPress={() => elegirCarpeta(k)} />
              ))}
            </View>
          )}

          {/* Fecha */}
          <Etiqueta c={c} texto="Fecha" />
          <View style={styles.filaFecha}>
            <BotonCuadrado c={c} texto="‹" etiqueta="Día anterior" onPress={() => setFecha((d) => sumarDias(d, -1))} />
            <Text style={[styles.textoFecha, { color: c.texto }]}>{fechaLarga(fecha)}</Text>
            <BotonCuadrado c={c} texto="›" etiqueta="Día siguiente" onPress={() => setFecha((d) => sumarDias(d, 1))} />
            <Chip c={c} texto="Hoy" activo={esHoy} onPress={() => setFecha(hoy())} />
          </View>

          {/* Prioridad */}
          <Etiqueta c={c} texto="Prioridad" />
          <View style={styles.chips}>
            {PRIORIDADES.map((p) => (
              <Chip key={p.valor} c={c} texto={p.texto} activo={p.valor === prioridad} onPress={() => setPrioridad(p.valor)} />
            ))}
          </View>

          {/* Nota */}
          <Etiqueta c={c} texto="Nota (opcional)" />
          <TextInput
            value={nota}
            onChangeText={setNota}
            placeholder="Ej.: compra de la semana"
            placeholderTextColor={c.textoSuave}
            maxLength={200}
            multiline
            style={[styles.inputNota, { color: c.texto, backgroundColor: c.superficie, borderColor: c.borde }]}
          />

          {error ? (
            <View style={[styles.cajaError, { borderColor: c.error }]} accessibilityRole="alert">
              <Text style={{ color: c.error }}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={guardar}
            disabled={guardando || cargando}
            style={({ pressed }) => [
              styles.botonGuardar,
              { backgroundColor: c.primario, opacity: guardando || cargando ? 0.6 : pressed ? 0.85 : 1 },
            ]}
            accessibilityRole="button">
            {guardando ? (
              <ActivityIndicator color={c.sobrePrimario} />
            ) : (
              <Text style={{ color: c.sobrePrimario, fontSize: 17, fontWeight: '700' }}>Guardar</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Etiqueta({ c, texto }: { c: Colores; texto: string }) {
  return <Text style={[styles.etiqueta, { color: c.textoSuave }]}>{texto}</Text>;
}

function Chip({ c, texto, activo, onPress }: { c: Colores; texto: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
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

function BotonCuadrado({ c, texto, etiqueta, onPress }: { c: Colores; texto: string; etiqueta: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cuadrado, { backgroundColor: c.superficie, borderColor: c.borde, opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}>
      <Text style={{ color: c.primario, fontSize: 28, fontWeight: '700', lineHeight: 32 }}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  contenido: {
    padding: espacio.l,
    gap: espacio.m,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontSize: 18, fontWeight: '700' },
  botonTexto: { minHeight: ALTURA_TACTIL, minWidth: 80, justifyContent: 'center' },
  segmentado: { flexDirection: 'row', borderWidth: 1, borderRadius: radio.m, padding: 4, gap: 4 },
  segmento: {
    flex: 1,
    minHeight: ALTURA_TACTIL - 4,
    borderRadius: radio.s,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cajaMonto: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: espacio.m },
  simbolo: { fontSize: 44, fontWeight: '800', marginRight: espacio.xs },
  inputMonto: { fontSize: 52, fontWeight: '800', minWidth: 60, minHeight: 72, textAlign: 'center', padding: 0 },
  etiqueta: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: espacio.s },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s },
  chip: {
    minHeight: 44,
    paddingHorizontal: espacio.m,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaFecha: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  textoFecha: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  cuadrado: {
    width: ALTURA_TACTIL,
    height: ALTURA_TACTIL,
    borderRadius: radio.m,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputNota: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: radio.m,
    padding: espacio.m,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  cajaError: { borderWidth: 1.5, borderRadius: radio.m, padding: espacio.m },
  botonGuardar: {
    minHeight: 52,
    borderRadius: radio.m,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: espacio.s,
  },
});
