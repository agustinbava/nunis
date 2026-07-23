import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ImageBackground,
  useWindowDimensions, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';

const BG_IMAGE = 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=1200&q=90';

function WebLogin() {
  const { login } = useAuth();
  const router = useRouter();

  // Listen for messages from the iframe login form
  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = async (e: MessageEvent) => {
      if (e.data?.type === 'nunis-login') {
        const result = await login(e.data.email, e.data.password);
        if (result.success) router.replace('/');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [login, router]);

  return (
    <View style={{ flex: 1 }}>
      {React.createElement('iframe', {
        src: '/landing/login.html',
        style: { width: '100%', height: '100%', border: 'none', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
      })}
    </View>
  );
}

export default function LoginScreen() {
  if (Platform.OS === 'web') {
    return <WebLogin />;
  }

  return <NativeLogin />;
}

function NativeLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width > 600;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Completá todos los campos');
      return;
    }
    setLoading(true);
    setError('');
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      router.replace('/');
    } else {
      setError(result.error || 'Error al iniciar sesión');
    }
  };

  return (
    <View style={styles.root}>
      <ImageBackground
        source={{ uri: BG_IMAGE }}
        style={styles.bgImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              isWide && { paddingHorizontal: 0 },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.content, isWide && { maxWidth: 440, alignSelf: 'center', width: '100%' }]}>
              {/* Logo */}
              <View style={styles.header}>
                <Image
                  source={require('../../assets/nunis-logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                <Text style={styles.tagline}>Tu santuario personal</Text>
              </View>

              {/* Glass card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Bienvenido</Text>
                <Text style={styles.cardSubtitle}>
                  Inicia sesión para continuar tu viaje.
                </Text>

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
                  placeholder="Tu contraseña"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                {error ? (
                  <Text style={styles.error}>{error}</Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Entrando...' : 'Entrar  \u2192'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/(auth)/register')}
                  style={styles.link}
                >
                  <Text style={styles.linkText}>
                    ¿No tenés cuenta?{' '}
                    <Text style={styles.linkAccent}>Registrarse</Text>
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

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 15, 40, 0.65)',
  },

  container: { flex: 1 },

  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },

  content: {},

  /* Header / Wordmark */
  header: { alignItems: 'center', marginBottom: 36 },
  logoImage: {
    width: 200,
    height: 80,
    
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },

  /* Glass card */
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    // Backdrop blur doesn't work in RN, but the semi-transparent bg gives a similar feel
  },
  cardTitle: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 28,
  },

  /* Labels */
  label: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
    marginLeft: 4,
  },

  /* Inputs */
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
    color: '#ffffff',
    marginBottom: 16,
    borderWidth: 0,
  },

  /* Error */
  error: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: '#ff6b6b',
    marginBottom: 12,
    textAlign: 'center',
  },

  /* Button */
  button: {
    backgroundColor: '#6C5CE7',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },

  /* Link */
  link: { marginTop: 24, alignItems: 'center' },
  linkText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: 'rgba(255,255,255,0.5)',
  },
  linkAccent: {
    color: '#c6bfff',
    fontFamily: 'Outfit_600SemiBold',
    textDecorationLine: 'underline',
  },
});
