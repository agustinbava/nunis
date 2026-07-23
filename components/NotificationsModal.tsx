import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';

const SCREEN_HEIGHT = Dimensions.get('window').height;

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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { height: SCREEN_HEIGHT * 0.8 }]}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>X</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Notificaciones</Text>

          {messages.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="notifications-off-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Todavía no tenés notificaciones.{'\n'}Cuando tu profesional te escriba, va a aparecer acá.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {messages.map((m) => (
                <View key={m.id} style={[styles.item, !m.read_at && { backgroundColor: colors.accent }]}>
                  <View style={styles.itemHeader}>
                    <Text style={[styles.from, { color: colors.primary }]}>{m.psych_name || 'Tu profesional'}</Text>
                    {!m.read_at && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
                    <View style={{ flex: 1 }} />
                    <Text style={[styles.time, { color: colors.textSecondary }]}>{formatDateTime(m.created_at)}</Text>
                  </View>
                  <Text style={[styles.body, { color: colors.text }]}>{m.body}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  backdropTouch: { flex: 1 },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 8, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D1D6' },
  closeBtn: { position: 'absolute', right: 20, top: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: '#F0EDED', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: '#787586' },
  title: { fontSize: 24, fontFamily: 'PlayfairDisplay_700Bold', paddingHorizontal: 24, marginBottom: 12 },
  list: { padding: 24, paddingTop: 4, gap: 10 },
  item: { borderRadius: 16, padding: 16, backgroundColor: '#F7F5FF', marginBottom: 2 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  from: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  time: { fontSize: 12, fontFamily: 'Outfit_400Regular' },
  body: { fontSize: 15, fontFamily: 'Outfit_400Regular', lineHeight: 22 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 14 },
  emptyText: { fontSize: 15, fontFamily: 'Outfit_400Regular', textAlign: 'center', lineHeight: 22 },
});
