import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';
import { sendMessage } from '../lib/database';
import ModalSheet from './ModalSheet';
import { TEAL, GREY_INK, FIELD } from '../constants/palette';

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
  const toggleAll = () => setSelected(allSelected ? [] : patients.map((p) => p.patient_id));

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

  if (sent) {
    return (
      <ModalSheet visible={visible} onClose={onClose} heightRatio={0.85} scroll={false}>
        <View style={styles.successBox}>
          <View style={[styles.successCircle, { backgroundColor: TEAL + '1F' }]}>
            <Ionicons name="checkmark" size={40} color={TEAL} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>Mensaje enviado</Text>
          <Text style={[styles.successSub, { color: colors.textSecondary }]}>
            A {selected.length} paciente{selected.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </ModalSheet>
    );
  }

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Enviar mensaje"
      subtitle="Recomendá un libro, mandá un recordatorio o un mensaje para tus pacientes."
      heightRatio={0.85}
    >
      <View style={styles.recipientHeader}>
        <Text style={[styles.label, { color: colors.text }]}>Destinatarios</Text>
        <TouchableOpacity onPress={toggleAll} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
            <View style={[styles.checkbox, { borderColor: on ? colors.primary : '#D6D1E2', backgroundColor: on ? colors.primary : 'transparent' }]}>
              {on && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={[styles.patientName, { color: colors.text }]}>{p.name}</Text>
          </TouchableOpacity>
        );
      })}

      <Text style={[styles.label, { color: colors.text, marginTop: 22 }]}>Mensaje</Text>
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder="Ej: Les recomiendo el libro 'El poder del ahora' de Eckhart Tolle..."
        placeholderTextColor={GREY_INK}
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
        <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
        <Text style={styles.sendBtnText}>
          {sending ? 'Enviando...' : `Enviar${selected.length ? ` a ${selected.length}` : ''}`}
        </Text>
      </TouchableOpacity>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  recipientHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  selectAll: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  empty: { fontSize: 14, fontFamily: 'Outfit_400Regular', paddingVertical: 12 },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, marginBottom: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  patientName: { fontSize: 15, fontFamily: 'Outfit_500Medium' },
  input: { backgroundColor: FIELD, borderRadius: 16, padding: 16, fontSize: 15, fontFamily: 'Outfit_400Regular', minHeight: 120, marginTop: 8 },
  error: { fontSize: 13, fontFamily: 'Outfit_500Medium', color: '#D9534F', marginTop: 12 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, padding: 16, marginTop: 20 },
  sendBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
  successBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  successCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successTitle: { fontSize: 22, fontFamily: 'PlayfairDisplay_700Bold' },
  successSub: { fontSize: 15, fontFamily: 'Outfit_400Regular', marginTop: 6 },
});
