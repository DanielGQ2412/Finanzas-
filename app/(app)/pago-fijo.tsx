import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mensajeError, obtenerCarpetas, obtenerEspacioPersonal, type Carpeta, type Prioridad } from '@/lib/finanzas';
import { actualizarPagoFijo, crearPagoFijo, obtenerPagoFijo, type PagoFijo } from '@/lib/fijos';
import { colones, leerMonto } from '@/lib/formato';
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

/** Crear (con ?carpetaId=) o editar (con ?id=) un pago fijo. */
export default function FormularioPagoFijo() {
  const c = useTema();
  const { id, carpetaId: carpetaInicial } = useLocalSearchParams<{ id?: string; carpetaId?: string }>();
  const { sesion } = useSesion();
  const usuarioId = sesion?.user.id;
  const editando = !!id;

  const [espacioId, setEspacioId] = useState<string | null>(null);
  const [fijas, setFijas] = useState<Carpeta[]>([]);
  const [original, setOriginal] = useState<PagoFijo | null>(null);
  const [cargando, setCargando] = useState(true);

  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState(0);
  const [dia, setDia] = useState('');
  const [prioridad, setPrioridad] = useState<Prioridad>('media');
  const [carpetaId, setCarpetaId] = useState<string | null>(carpetaInicial ?? null);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!usuarioId) return;
    let activo = true;
    (async () => {
      try {
        const esp = await obtenerEspacioPersonal(usuarioId);
        if (!esp) throw new Error('sin espacio personal');
        const [carpetas, pago] = await Promise.all([obtenerCarpetas(esp), id ? obtenerPagoFijo(id) : Promise.resolve(null)]);
        if (!activo) return;
        setEspacioId(esp);
        setFijas(carpetas.filter((k) => k.tipo === 'fijo'));
        if (id && !pago) setError('No encontramos este pago fijo.');
        if (pago) {
          setOriginal(pago);
          setNombre(pago.nombre);
          setMonto(pago.monto);
          setDia(pago.dia_pago != null ? String(pago.dia_pago) : '');
          setPrioridad(pago.prioridad);
          setCarpetaId(pago.carpeta_id);
        } else if (carpetaInicial) {
          const k = carpetas.find((x) => x.id === carpetaInicial);
          if (k) setPrioridad(k.prioridad);
        }
      } catch (e) {
        if (activo) setError(mensajeError(e as { message?: string }, 'cargar el pago'));
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [usuarioId, id, carpetaInicial]);

  const guardar = async () => {
    const nombreLimpio = nombre.trim();
    const diaNum = Number(dia);
    if (!nombreLimpio) return setError('Escribí un nombre, por ejemplo "Luz".');
    if (monto <= 0) return setError('Escribí un monto mayor a cero.');
    if (!Number.isInteger(diaNum) || diaNum < 1 || diaNum > 31) return setError('El día de pago debe ser un número del 1 al 31.');
    if (!carpetaId) return setError('Elegí una carpeta.');
    if (!espacioId) return setError('No encontramos tu espacio Personal.');

    setError(null);
    setGuardando(true);
    try {
      const datos = { carpeta_id: carpetaId, nombre: nombreLimpio, monto, dia_pago: diaNum, prioridad };
      if (editando && id) await actualizarPagoFijo(id, datos);
      else await crearPagoFijo(espacioId, datos);
      volver();
    } catch (e) {
      setError(mensajeError(e as { message?: string; code?: string }, 'guardar el pago'));
      setGuardando(false);
    }
  };

  const cambiarActivo = async () => {
    if (!id || !original) return;
    setError(null);
    setGuardando(true);
    try {
      await actualizarPagoFijo(id, { activo: !original.activo });
      volver();
    } catch (e) {
      setError(mensajeError(e as { message?: string; code?: string }, original.activo ? 'desactivar el pago' : 'reactivar el pago'));
      setGuardando(false);
    }
  };

  const campo = [ui.campo, { color: c.texto, backgroundColor: c.superficie, borderColor: c.borde }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.fondo }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={ui.contenido} keyboardShouldPersistTaps="handled">
          <View style={ui.encabezadoModal}>
            <Pressable onPress={volver} style={ui.botonTexto} accessibilityRole="button">
              <Text style={{ color: c.primario, fontSize: 16, fontWeight: '600' }}>Cancelar</Text>
            </Pressable>
            <Text style={{ color: c.texto, fontSize: 18, fontWeight: '700' }}>{editando ? 'Editar pago' : 'Nuevo pago fijo'}</Text>
            <View style={ui.botonTexto} />
          </View>

          {cargando ? (
            <ActivityIndicator color={c.primario} size="large" style={{ marginTop: espacio.xl }} />
          ) : (
            <>
              {original && !original.activo ? (
                <Text style={{ color: c.textoSuave, fontWeight: '600' }}>Este pago está desactivado.</Text>
              ) : null}

              <Etiqueta c={c} texto="Nombre" />
              <TextInput
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej.: Luz, Internet, Préstamo carro"
                placeholderTextColor={c.textoSuave}
                maxLength={60}
                style={campo}
              />

              <Etiqueta c={c} texto="Monto mensual" />
              <View style={[...campo, { flexDirection: 'row', alignItems: 'center', gap: espacio.xs }]}>
                <Text style={{ color: c.texto, fontSize: 18, fontWeight: '700' }}>₡</Text>
                <TextInput
                  value={monto > 0 ? colones(monto).slice(1) : ''}
                  onChangeText={(t) => setMonto(leerMonto(t))}
                  placeholder="0"
                  placeholderTextColor={c.textoSuave}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  style={{ flex: 1, color: c.texto, fontSize: 18, fontWeight: '700', minHeight: 44 }}
                  accessibilityLabel="Monto mensual en colones"
                />
              </View>

              <Etiqueta c={c} texto="Día de pago (1 a 31)" />
              <TextInput
                value={dia}
                onChangeText={(t) => setDia(t.replace(/\D/g, '').slice(0, 2))}
                placeholder="Ej.: 15"
                placeholderTextColor={c.textoSuave}
                keyboardType="number-pad"
                inputMode="numeric"
                style={[...campo, { maxWidth: 140 }]}
                accessibilityLabel="Día de pago"
              />

              <Etiqueta c={c} texto="Prioridad" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s }}>
                {PRIORIDADES.map((p) => (
                  <Chip key={p.valor} c={c} texto={p.texto} activo={p.valor === prioridad} onPress={() => setPrioridad(p.valor)} />
                ))}
              </View>

              <Etiqueta c={c} texto="Carpeta" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s }}>
                {fijas.map((k) => (
                  <Chip key={k.id} c={c} texto={k.nombre} activo={k.id === carpetaId} onPress={() => setCarpetaId(k.id)} />
                ))}
              </View>

              <CajaError c={c} texto={error} />
              <BotonPrincipal c={c} texto="Guardar" onPress={guardar} ocupado={guardando} />

              {editando && original ? (
                <>
                  <BotonPrincipal
                    c={c}
                    texto={original.activo ? 'Desactivar pago' : 'Reactivar pago'}
                    variante={original.activo ? 'peligro' : 'borde'}
                    onPress={cambiarActivo}
                    deshabilitado={guardando}
                  />
                  {original.activo ? (
                    <Text style={{ color: c.textoSuave, fontSize: 13 }}>
                      Al desactivarlo deja de aparecer cada mes, pero se conserva el historial de pagos.
                    </Text>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
