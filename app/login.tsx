import { Redirect } from 'expo-router';
import { useState } from 'react';
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

import { useSesion } from '@/lib/sesion';
import { faltaConfiguracion, supabase } from '@/lib/supabase';
import { ALTURA_TACTIL, espacio, radio, useTema } from '@/lib/tema';

function traducirError(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('email not confirmed')) return 'Tenés que confirmar tu correo antes de entrar.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Esperá un momento.';
  if (m.includes('network') || m.includes('fetch')) return 'No hay conexión. Revisá tu internet.';
  return 'No se pudo iniciar sesión. Intentá de nuevo.';
}

export default function Login() {
  const c = useTema();
  const { sesion } = useSesion();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sesion) return <Redirect href="/inicio" />;

  const entrar = async () => {
    setError(null);
    const correoLimpio = correo.trim();
    if (!correoLimpio || !contrasena) {
      setError('Escribí tu correo y tu contraseña.');
      return;
    }
    if (faltaConfiguracion) {
      setError('La app no está configurada: completá el archivo .env y reiniciá.');
      return;
    }
    setEnviando(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: correoLimpio,
      password: contrasena,
    });
    setEnviando(false);
    if (err) setError(traducirError(err.message));
    // Si sale bien, onAuthStateChange actualiza la sesión y se redirige a /inicio.
  };

  const campo = [
    styles.campo,
    { color: c.texto, backgroundColor: c.superficie, borderColor: c.borde },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.contenedor} keyboardShouldPersistTaps="handled">
        <View style={styles.caja}>
          <Text style={[styles.titulo, { color: c.primario }]}>Finanzas</Text>
          <Text style={[styles.subtitulo, { color: c.textoSuave }]}>
            Iniciá sesión para continuar
          </Text>

          <Text style={[styles.etiqueta, { color: c.texto }]}>Correo electrónico</Text>
          <TextInput
            style={campo}
            value={correo}
            onChangeText={setCorreo}
            placeholder="tu@correo.com"
            placeholderTextColor={c.textoSuave}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            accessibilityLabel="Correo electrónico"
          />

          <Text style={[styles.etiqueta, { color: c.texto }]}>Contraseña</Text>
          <View style={styles.filaContrasena}>
            <TextInput
              style={[campo, { flex: 1 }]}
              value={contrasena}
              onChangeText={setContrasena}
              placeholder="Tu contraseña"
              placeholderTextColor={c.textoSuave}
              secureTextEntry={!verContrasena}
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={entrar}
              accessibilityLabel="Contraseña"
            />
            <Pressable
              onPress={() => setVerContrasena((v) => !v)}
              style={[styles.botonVer, { borderColor: c.borde }]}
              accessibilityRole="button"
              accessibilityLabel={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              <Text style={{ color: c.primario, fontWeight: '600' }}>
                {verContrasena ? 'Ocultar' : 'Mostrar'}
              </Text>
            </Pressable>
          </View>

          {error && (
            <Text style={[styles.error, { color: c.error }]} accessibilityRole="alert">
              {error}
            </Text>
          )}

          <Pressable
            onPress={entrar}
            disabled={enviando}
            style={({ pressed }) => [
              styles.boton,
              { backgroundColor: c.primario, opacity: pressed || enviando ? 0.8 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Entrar">
            {enviando ? (
              <ActivityIndicator color={c.sobrePrimario} />
            ) : (
              <Text style={[styles.textoBoton, { color: c.sobrePrimario }]}>Entrar</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flexGrow: 1, justifyContent: 'center', padding: espacio.l },
  caja: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  titulo: { fontSize: 34, fontWeight: '800', marginBottom: espacio.xs },
  subtitulo: { fontSize: 16, marginBottom: espacio.xl },
  etiqueta: { fontSize: 14, fontWeight: '600', marginBottom: espacio.xs, marginTop: espacio.m },
  campo: {
    minHeight: ALTURA_TACTIL,
    borderWidth: 1,
    borderRadius: radio.m,
    paddingHorizontal: espacio.m,
    fontSize: 16,
  },
  filaContrasena: { flexDirection: 'row', gap: espacio.s },
  botonVer: {
    minHeight: ALTURA_TACTIL,
    minWidth: 80,
    paddingHorizontal: espacio.m,
    borderWidth: 1,
    borderRadius: radio.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { marginTop: espacio.m, fontSize: 14 },
  boton: {
    minHeight: ALTURA_TACTIL,
    borderRadius: radio.m,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: espacio.l,
  },
  textoBoton: { fontSize: 16, fontWeight: '700' },
});
