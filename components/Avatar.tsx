import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';

interface Props {
  url?: string | null;
  name?: string;
  size?: number;
  onPress?: () => void;
  editable?: boolean;
  loading?: boolean;
}

function initialsOf(name?: string): string {
  return (name || '')
    .replace('Lic. ', '')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Avatar({ url, name, size = 48, onPress, editable, loading }: Props) {
  const { colors } = useTheme();
  const initials = initialsOf(name);

  const inner = url ? (
    <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View style={[styles.center, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accent }]}>
      <Text style={{ color: colors.primary, fontFamily: 'PlayfairDisplay_700Bold', fontSize: size * 0.36 }}>
        {initials || '?'}
      </Text>
    </View>
  );

  if (!onPress) {
    return <View style={{ width: size, height: size }}>{inner}</View>;
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ width: size, height: size }} disabled={loading}>
      {inner}
      {editable && (
        <View
          style={[
            styles.badge,
            {
              width: size * 0.36,
              height: size * 0.36,
              borderRadius: (size * 0.36) / 2,
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Ionicons name={loading ? 'hourglass' : 'camera'} size={size * 0.2} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
