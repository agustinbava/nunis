import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../lib/theme-context';

const SCREEN_HEIGHT = Dimensions.get('window').height;

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

interface Props {
  visible: boolean;
  messages: any[]; // no leídos
  onClose: () => void;
}

export default function NotificationPopup({ visible, messages, onClose }: Props) {
  const { colors } = useTheme();
  const count = messages.length;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={[styles.bell, { backgroundColor: colors.accent }]}>
            <Text style={[styles.bellIcon, { color: colors.primary }]}>{'✉'}</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {count === 1 ? 'Tenés un mensaje nuevo' : `Tenés ${count} mensajes nuevos`}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>De tu profesional</Text>

          <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.4 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {messages.map((m) => (
              <View key={m.id} style={[styles.msg, { backgroundColor: '#F7F5FF' }]}>
                <View style={styles.msgHeader}>
                  <Text style={[styles.msgFrom, { color: colors.primary }]}>{m.psych_name || 'Tu profesional'}</Text>
                  <Text style={[styles.msgTime, { color: colors.textSecondary }]}>{formatDateTime(m.created_at)}</Text>
                </View>
                <Text style={[styles.msgBody, { color: colors.text }]}>{m.body}</Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.btnText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,15,40,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 28, width: '100%', maxWidth: 420, alignItems: 'center' },
  bell: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  bellIcon: { fontSize: 28 },
  title: { fontSize: 22, fontFamily: 'PlayfairDisplay_700Bold', textAlign: 'center' },
  subtitle: { fontSize: 14, fontFamily: 'Outfit_400Regular', marginTop: 4, marginBottom: 18 },
  list: { gap: 10, alignSelf: 'stretch' },
  msg: { borderRadius: 16, padding: 14, marginBottom: 2 },
  msgHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  msgFrom: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  msgTime: { fontSize: 12, fontFamily: 'Outfit_400Regular' },
  msgBody: { fontSize: 15, fontFamily: 'Outfit_400Regular', lineHeight: 22 },
  btn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', alignSelf: 'stretch', marginTop: 18 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
});
