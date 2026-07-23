import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';
import ModalSheet from './ModalSheet';
import { GREY_INK } from '../constants/palette';

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

interface Props {
  visible: boolean;
  messages: any[];
  onClose: () => void;
}

export default function NotificationsModal({ visible, messages, onClose }: Props) {
  const { colors } = useTheme();
  const unread = messages.filter((m) => !m.read_at).length;

  if (messages.length === 0) {
    return (
      <ModalSheet visible={visible} onClose={onClose} heightRatio={0.8} scroll={false}>
        <View style={styles.emptyBox}>
          <Ionicons name="notifications-off-outline" size={40} color={GREY_INK} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Todavía no tenés notificaciones.{'\n'}Cuando tu profesional te escriba, va a aparecer acá.
          </Text>
        </View>
      </ModalSheet>
    );
  }

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Notificaciones"
      subtitle={unread > 0 ? `${unread} sin leer` : 'Mensajes de tu profesional'}
      heightRatio={0.8}
    >
      {messages.map((m) => (
        <View key={m.id} style={[styles.item, !m.read_at && { backgroundColor: colors.accent }]}>
          <View style={styles.itemHeader}>
            <Text style={[styles.from, { color: colors.primary }]} numberOfLines={1}>{m.psych_name || 'Tu profesional'}</Text>
            {!m.read_at && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
            <View style={{ flex: 1 }} />
            <Text style={[styles.time, { color: GREY_INK }]}>{formatDateTime(m.created_at)}</Text>
          </View>
          <Text style={[styles.body, { color: colors.text }]}>{m.body}</Text>
        </View>
      ))}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  item: { borderRadius: 18, padding: 16, backgroundColor: '#F9F8FC', marginBottom: 10 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  from: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  time: { fontSize: 12, fontFamily: 'Outfit_400Regular' },
  body: { fontSize: 15, fontFamily: 'Outfit_400Regular', lineHeight: 22 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 14 },
  emptyText: { fontSize: 15, fontFamily: 'Outfit_400Regular', textAlign: 'center', lineHeight: 22 },
});
