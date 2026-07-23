import React from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Platform, View, StyleSheet, useWindowDimensions } from 'react-native';
import { useAuth } from '../lib/auth-context';

function WebLanding() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const src = isMobile ? '/landing/mobile.html' : '/landing/index.html';

  return (
    <View style={styles.landing}>
      {React.createElement('iframe', {
        src,
        style: {
          width: '100%',
          height: '100%',
          border: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        },
      })}
    </View>
  );
}

function NativeLanding() {
  const router = useRouter();
  const WebView = require('react-native-webview').default;
  const { mobileLandingHtml } = require('../lib/landing-html');

  return (
    <View style={styles.landing}>
      <WebView
        source={{ html: mobileLandingHtml }}
        style={styles.landing}
        onNavigationStateChange={(event: any) => {
          // Intercept navigation to app routes
          if (event.url.includes('/register')) {
            router.push('/(auth)/register');
          } else if (event.url.includes('/login')) {
            router.push('/(auth)/login');
          }
        }}
      />
    </View>
  );
}

export default function Index() {
  const { user, loading } = useAuth();

  // Mientras se restaura la sesión persistida, no mostrar la landing: evita el
  // "flash de landing" al recargar cuando el usuario ya está logueado.
  if (loading) {
    return <View style={[styles.landing, { backgroundColor: '#F8F7FF' }]} />;
  }

  if (!user) {
    if (Platform.OS === 'web') {
      return <WebLanding />;
    }
    return <NativeLanding />;
  }

  if (user.role === 'psychologist') {
    return <Redirect href="/(psych)/dashboard" />;
  }

  return <Redirect href="/(app)" />;
}

const styles = StyleSheet.create({
  landing: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
