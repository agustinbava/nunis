import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, Dimensions,
} from 'react-native';
import { useTheme } from '../lib/theme-context';
import { createConsultation, getPatientConsultations } from '../lib/database';

const SCREEN_HEIGHT = Dimensions.get('window').height;
export const CONSULT_PRICE = 6000;

function genId() { const c = 'abcdefghijklmnopqrstuvwxyz0123456789'; let r = 'con_'; for (let i = 0; i < 16; i++) r += c[Math.floor(Math.random() * c.length)]; return r; }
function money(n: number) { return '$' + Math.round(n).toLocaleString('es-AR'); }
function when(iso: string) { try { const d = new Date(iso); return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } }

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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { height: SCREEN_HEIGHT * 0.88 }]}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtnText}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: colors.text }]}>Consultá a tu profesional</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Una consulta puntual entre sesiones. {psychName || 'Tu profesional'} te responde de forma asincrónica.
            </Text>

            <View style={[styles.priceTag, { backgroundColor: colors.accent }]}>
              <Text style={[styles.priceText, { color: colors.primary }]}>{money(CONSULT_PRICE)} por respuesta</Text>
            </View>

            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Escribí tu consulta..."
              placeholderTextColor={colors.textSecondary}
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
              <Text style={styles.sendBtnText}>{sending ? 'Enviando...' : 'Enviar consulta'}</Text>
            </TouchableOpacity>

            {items.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Tus consultas</Text>
                {items.map((c) => (
                  <View key={c.id} style={styles.item}>
                    <View style={styles.itemHead}>
                      <Text style={[styles.itemDate, { color: colors.textSecondary }]}>{when(c.created_at)}</Text>
                      <View style={[styles.statusTag, { backgroundColor: c.status === 'answered' ? '#E8F5E9' : '#FFF3E9' }]}>
                        <Text style={[styles.statusText, { color: c.status === 'answered' ? colors.success : '#B5651D' }]}>
                          {c.status === 'answered' ? 'Respondida' : 'Esperando respuesta'}
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
                ))}
              </>
            )}
          </ScrollView>
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
  subtitle: { fontSize: 14, fontFamily: 'Outfit_400Regular', lineHeight: 20, marginTop: 4, marginBottom: 14 },
  priceTag: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9999, marginBottom: 14 },
  priceText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  input: { backgroundColor: '#f6f3f2', borderRadius: 16, padding: 16, fontSize: 15, fontFamily: 'Outfit_400Regular', minHeight: 110 },
  error: { fontSize: 13, fontFamily: 'Outfit_500Medium', color: '#E74C3C', marginTop: 10 },
  sendBtn: { borderRadius: 16, padding: 15, alignItems: 'center', marginTop: 12 },
  sendBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  sectionLabel: { fontSize: 16, fontFamily: 'PlayfairDisplay_700Bold', marginTop: 26, marginBottom: 12 },
  item: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F2F0F7' },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemDate: { fontSize: 12, fontFamily: 'Outfit_400Regular' },
  statusTag: { borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontFamily: 'Outfit_600SemiBold' },
  q: { fontSize: 15, fontFamily: 'Outfit_500Medium', lineHeight: 21 },
  answerBox: { borderRadius: 14, padding: 14, marginTop: 10 },
  answerFrom: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', marginBottom: 4 },
  answerBody: { fontSize: 14, fontFamily: 'Outfit_400Regular', lineHeight: 21 },
});
