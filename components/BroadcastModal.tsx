import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, Dimensions,
} from 'react-native';
import { useTheme } from '../lib/theme-context';
import { sendMessage } from '../lib/database';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface Patient { patient_id: string; name: string; }
interface Props {
  visible: boolean;
  psychId: string;
  patients: Patient[];
  onClose: () => void;
  onSent?: () => void;
}

export default function BroadcastModal({ visible, psychId, patients, onClose, onSent }: Props) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<string[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (visible) { setSelected([]); setBody(''); setError(''); setSent(false); }
  }, [visible]);

  const allSelected = patients.length > 0 && selected.length === patients.length;
  const toggle = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleAll = () =>
    setSelected(allSelected ? [] : patients.map((p) => p.patient_id));

  const handleSend = async () => {
    if (!body.trim() || selected.length === 0) {
      setError('Elegí al menos un paciente y escribí el mensaje.');
      return;
    }
    setError('');
    setSending(true);
    try {
      await sendMessage(psychId, selected, body.trim());
      setSent(true);
      onSent?.();
      setTimeout(() => { setSending(false); onClose(); }, 1200);
    } catch (e: any) {
      setError('No se pudo enviar: ' + (e?.message ?? 'error'));
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { height: SCREEN_HEIGHT * 0.85 }]}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>X</Text>
            </TouchableOpacity>
          </View>

          {sent ? (
            <View style={styles.successBox}>
              <View style={[styles.successCircle, { backgroundColor: '#E8F5E9' }]}>
                <Text style={styles.successCheck}>{'✓'}</Text>
              </View>
              <Text style={[styles.successTitle, { color: colors.text }]}>Mensaje enviado</Text>
              <Text style={[styles.successSub, { color: colors.textSecondary }]}>
                A {selected.length} paciente{selected.length !== 1 ? 's' : ''}
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.title, { color: colors.text }]}>Enviar mensaje</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Recomendá un libro, mandá un recordatorio o un mensaje para tus pacientes.
              </Text>

              <View style={styles.recipientHeader}>
                <Text style={[styles.label, { color: colors.text }]}>Destinatarios</Text>
                <TouchableOpacity onPress={toggleAll} activeOpacity={0.7}>
                  <Text style={[styles.selectAll, { color: colors.primary }]}>
                    {allSelected ? 'Ninguno' : 'Seleccionar todos'}
                  </Text>
                </TouchableOpacity>
              </View>

              {patients.length === 0 ? (
                <Text style={[styles.empty, { color: colors.textSecondary }]}>Todavía no tenés pacientes vinculados.</Text>
              ) : patients.map((p) => {
                const on = selected.includes(p.patient_id);
                return (
                  <TouchableOpacity
                    key={p.patient_id}
                    style={[styles.patientRow, on && { backgroundColor: colors.accent }]}
                    onPress={() => toggle(p.patient_id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, { borderColor: on ? colors.primary : '#CFC9DE', backgroundColor: on ? colors.primary : 'transparent' }]}>
                      {on && <Text style={styles.checkMark}>{'✓'}</Text>}
                    </View>
                    <Text style={[styles.patientName, { color: colors.text }]}>{p.name}</Text>
                  </TouchableOpacity>
                );
              })}

              <Text style={[styles.label, { color: colors.text, marginTop: 20 }]}>Mensaje</Text>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Ej: Les recomiendo el libro 'El poder del ahora' de Eckhart Tolle..."
                placeholderTextColor={colors.textSecondary}
                value={body}
                onChangeText={setBody}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: colors.primary }, sending && { opacity: 0.7 }]}
                onPress={handleSend}
                disabled={sending}
                activeOpacity={0.85}
              >
                <Text style={styles.sendBtnText}>
                  {sending ? 'Enviando...' : `Enviar${selected.length ? ` a ${selected.length}` : ''}`}
                </Text>
              </TouchableOpacity>
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
  content: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 24, fontFamily: 'PlayfairDisplay_700Bold' },
  subtitle: { fontSize: 14, fontFamily: 'Outfit_400Regular', lineHeight: 20, marginTop: 4, marginBottom: 20 },
  recipientHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  selectAll: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  empty: { fontSize: 14, fontFamily: 'Outfit_400Regular', paddingVertical: 12 },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, marginBottom: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  checkMark: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  patientName: { fontSize: 15, fontFamily: 'Outfit_500Medium' },
  input: { backgroundColor: '#f6f3f2', borderRadius: 16, padding: 16, fontSize: 15, fontFamily: 'Outfit_400Regular', minHeight: 120, marginTop: 8 },
  error: { fontSize: 13, fontFamily: 'Outfit_500Medium', color: '#E74C3C', marginTop: 12 },
  sendBtn: { borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 20 },
  sendBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
  successBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  successCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successCheck: { fontSize: 40, color: '#27AE60' },
  successTitle: { fontSize: 22, fontFamily: 'PlayfairDisplay_700Bold' },
  successSub: { fontSize: 15, fontFamily: 'Outfit_400Regular', marginTop: 6 },
});
