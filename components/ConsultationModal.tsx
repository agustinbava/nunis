import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';
import { createConsultation, getPatientConsultations } from '../lib/database';
import ModalSheet from './ModalSheet';
import { AMBER_BG, AMBER_INK, TEAL, GREY_INK, HAIR, FIELD } from '../constants/palette';

export const CONSULT_PRICE = 6000;

function genId() { const c = 'abcdefghijklmnopqrstuvwxyz0123456789'; let r = 'con_'; for (let i = 0; i < 16; i++) r += c[Math.floor(Math.random() * c.length)]; return r; }
function money(n: number) { return '$' + Math.round(n).toLocaleString('es-AR'); }
function when(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

interface Props { visible: boolean; patientId: string; psychId: string; psychName?: string; onClose: () => void; }

export default function ConsultationModal({ visible, patientId, psychId, psychName, onClose }: Props) {
  const { colors } = useTheme();
  const [items, setItems] = useState<any[]>([]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!patientId) return;
    try { setItems(await getPatientConsultations(patientId)); } catch { setItems([]); }
  }, [patientId]);

  useEffect(() => { if (visible) { load(); setQuestion(''); setError(''); } }, [visible, load]);

  const handleSend = async () => {
    if (!question.trim() || sending) return;
    if (!psychId) { setError('Vinculá un profesional primero.'); return; }
    setSending(true);
    setError('');
    try {
      await createConsultation(genId(), patientId, psychId, question.trim(), CONSULT_PRICE);
      setQuestion('');
      await load();
    } catch (e: any) { setError('No se pudo enviar: ' + (e?.message ?? 'error')); }
    setSending(false);
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Consultá a tu profesional"
      subtitle={`Una consulta puntual entre sesiones. ${psychName || 'Tu profesional'} te responde de forma asincrónica.`}
      heightRatio={0.88}
    >
      <View style={[styles.priceTag, { backgroundColor: colors.accent }]}>
        <Ionicons name="pricetag-outline" size={14} color={colors.primary} />
        <Text style={[styles.priceText, { color: colors.primary }]}>{money(CONSULT_PRICE)} por respuesta</Text>
      </View>

      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder="Escribí tu consulta..."
        placeholderTextColor={GREY_INK}
        value={question}
        onChangeText={setQuestion}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity
        style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: (question.trim() && !sending) ? 1 : 0.5 }]}
        onPress={handleSend}
        disabled={!question.trim() || sending}
        activeOpacity={0.85}
      >
        <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
        <Text style={styles.sendBtnText}>{sending ? 'Enviando...' : 'Enviar consulta'}</Text>
      </TouchableOpacity>

      {items.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Tus consultas</Text>
          {items.map((c) => {
            const answered = c.status === 'answered';
            return (
              <View key={c.id} style={styles.item}>
                <View style={styles.itemHead}>
                  <Text style={[styles.itemDate, { color: GREY_INK }]}>{when(c.created_at)}</Text>
                  <View style={[styles.statusTag, { backgroundColor: answered ? TEAL + '1F' : AMBER_BG }]}>
                    <Text style={[styles.statusText, { color: answered ? TEAL : AMBER_INK }]}>
                      {answered ? 'Respondida' : 'Esperando respuesta'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.q, { color: colors.text }]}>{c.question}</Text>
                {c.answer ? (
                  <View style={[styles.answerBox, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.answerFrom, { color: colors.primary }]}>{c.psych_name}</Text>
                    <Text style={[styles.answerBody, { color: colors.text }]}>{c.answer}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </>
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  priceTag: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999, marginBottom: 14 },
  priceText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  input: { backgroundColor: FIELD, borderRadius: 16, padding: 16, fontSize: 15, fontFamily: 'Outfit_400Regular', minHeight: 110 },
  error: { fontSize: 13, fontFamily: 'Outfit_500Medium', color: '#D9534F', marginTop: 10 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, padding: 15, marginTop: 12 },
  sendBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  sectionLabel: { fontSize: 17, fontFamily: 'PlayfairDisplay_700Bold', marginTop: 28, marginBottom: 12 },
  item: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: HAIR },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 },
  itemDate: { fontSize: 12, fontFamily: 'Outfit_400Regular' },
  statusTag: { borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontFamily: 'Outfit_600SemiBold' },
  q: { fontSize: 15, fontFamily: 'Outfit_500Medium', lineHeight: 21 },
  answerBox: { borderRadius: 14, padding: 14, marginTop: 10 },
  answerFrom: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', marginBottom: 4 },
  answerBody: { fontSize: 14, fontFamily: 'Outfit_400Regular', lineHeight: 21 },
});
