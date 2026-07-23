import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet, useWindowDimensions, ImageBackground, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme-context';

const BG_IMAGE = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1800&q=80';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
}

function AnimatedBackground({ children }: { children: React.ReactNode }) {
  // En web arrancamos ya en 1.0 y NO animamos: la animación JS (useNativeDriver
  // no está disponible en web) re-renderiza la imagen ~60fps durante 30s y, con
  // varias pantallas de tabs montadas a la vez, satura el hilo y genera parpadeo.
  const scale = React.useRef(new Animated.Value(Platform.OS === 'web' ? 1.0 : 1.12)).current;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    Animated.timing(scale, {
      toValue: 1.0,
      duration: 30000,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.bgWrapper}>
      <Animated.Image
        source={{ uri: BG_IMAGE }}
        style={[styles.bgImage, { transform: [{ scale }] }]}
        resizeMode="cover"
      />
      <View style={styles.bgOverlay} />
      {children}
    </View>
  );
}

export default function AppContainer({ children, scroll = true }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const inner = (
    <View style={[styles.inner, width > 600 && { maxWidth: 480, alignSelf: 'center', width: '100%' as any }]}>
      {children}
    </View>
  );

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {inner}
    </ScrollView>
  ) : inner;

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.safe}>
        {content}
      </SafeAreaView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  bgWrapper: { flex: 1 },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248, 247, 255, 0.88)',
  },
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 100 },
  inner: {},
});
