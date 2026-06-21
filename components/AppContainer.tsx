import React from 'react';
import { View, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme-context';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
}

export default function AppContainer({ children, scroll = true }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const inner = (
    <View style={[styles.inner, width > 600 && { maxWidth: 480, alignSelf: 'center', width: '100%' as any }]}>
      {children}
    </View>
  );

  if (scroll) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {inner}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      {inner}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 100 },
  inner: {},
});
