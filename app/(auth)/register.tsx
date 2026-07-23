import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ImageBackground,
  useWindowDimensions, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';

const BG_IMAGE = 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=1200&q=90';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'psychologist'>('patient');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width > 600;

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Completá todos los campos');
      return;
    }
    if (password.length < 7) {
      setError('La contraseña debe tener al menos 7 caracteres');
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('La contraseña debe incluir al menos una letra y un número');
      return;
    }
    setLoading(true);
    setError('');
    const result = await register(email, password, name, role);
    setLoading(false);
    if (result.success) {
      router.replace('/');
    } else {
      setError(result.error || 'Error al registrar');
    }
  };

  return (
    <View style={styles.root}>
      <ImageBackground source={{ uri: BG_IMAGE }} style={styles.bgImage} resizeMode="cover">
        <View style={styles.overlay} />
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={[styles.content, isWide && { maxWidth: 440, alignSelf: 'center', width: '100%' }]}>
              <View style={styles.header}>
                <Image
                  source={require('../../assets/nunis-logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Crear cuenta</Text>
                <Text style={styles.cardSubtitle}>Empezá tu viaje hacia el bienestar.</Text>

                {/* Role selector */}
                <View style={styles.roleRow}>
                  <TouchableOpacity
                    style={[styles.roleBtn, role === 'patient' && styles.roleBtnActive]}
                    onPress={() => setRole('patient')}
                  >
                    <Text style={[styles.roleBtnText, role === 'patient' && styles.roleBtnTextActive]}>
                      Paciente
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleBtn, role === 'psychologist' && styles.roleBtnActive]}
                    onPress={() => setRole('psychologist')}
                  >
                    <Text style={[styles.roleBtnText, role === 'psychologist' && styles.roleBtnTextActive]}>
                      Psicólogo/a
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Nombre</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tu nombre"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={name}
                  onChangeText={setName}
                />

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="tu@email.com"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <Text style={styles.label}>Contraseña</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Mínimo 7 caracteres, con letras y números"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                {role === 'psychologist' && (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                      Como profesional, tendrás un dashboard para ver el progreso de tus pacientes. Modelo con suscripción paga.
                    </Text>
                  </View>
                )}

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Creando...' : 'Crear cuenta  \u2192'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.link}>
                  <Text style={styles.linkText}>
                    Ya tengo cuenta. <Text style={styles.linkAccent}>Iniciar sesión</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1a1333' },
  bgImage: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20, 15, 40, 0.65)' },
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  content: {},

  header: { alignItems: 'center', marginBottom: 28 },
  logoImage: { width: 180, height: 72, tintColor: '#ffffff' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cardTitle: {
    fontSize: 26, fontFamily: 'PlayfairDisplay_700Bold', color: '#ffffff',
    textAlign: 'center', marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14, fontFamily: 'Outfit_400Regular', color: 'rgba(255,255,255,0.5)',
    textAlign: 'center', marginBottom: 24,
  },

  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  roleBtn: {
    flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16, padding: 14, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  roleBtnActive: {
    backgroundColor: 'rgba(108,92,231,0.3)',
    borderColor: '#6C5CE7',
  },
  roleBtnText: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: 'rgba(255,255,255,0.5)' },
  roleBtnTextActive: { color: '#ffffff' },

  label: {
    fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: 'rgba(255,255,255,0.6)',
    marginBottom: 8, marginLeft: 4,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 16,
    fontSize: 16, fontFamily: 'Outfit_400Regular', color: '#ffffff', marginBottom: 16,
  },

  infoBox: {
    backgroundColor: 'rgba(108,92,231,0.12)', borderWidth: 1, borderColor: 'rgba(108,92,231,0.3)',
    borderRadius: 16, padding: 14, marginBottom: 16,
  },
  infoText: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: 'rgba(255,255,255,0.6)', lineHeight: 19 },

  error: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: '#ff6b6b', marginBottom: 12, textAlign: 'center' },

  button: {
    backgroundColor: '#6C5CE7', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8,
    shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#ffffff', fontSize: 17, fontFamily: 'Outfit_600SemiBold' },

  link: { marginTop: 22, alignItems: 'center' },
  linkText: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: 'rgba(255,255,255,0.5)' },
  linkAccent: { color: '#c6bfff', fontFamily: 'Outfit_600SemiBold', textDecorationLine: 'underline' },
});
