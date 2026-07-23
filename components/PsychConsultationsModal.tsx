import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, Dimensions,
} from 'react-native';
import { useTheme } from '../lib/theme-context';
import { getPsychConsultations, answerConsultation } from '../lib/database';

const SCREEN_HEIGHT = Dimensions.get('window').height;

function money(n: number) { return '$' + Math.round(n).toLocaleString('es-AR'); }
function when(iso: string) { try { const d = new Date(iso); return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } }

interface Props { visible: boolean; psychId: string; onClose: () => void; }

export default function PsychConsultationsModal({ visible, psychId, onClose }: Props) {
  const { colors } = useTheme();
  const [items, setItems] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<{ [id: string]: string }>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!psychId) return;
    try { setItems(await getPsychConsultations(psychId)); } catch { setItems([]); }
  }, [psychId]);

  useEffect(() => { if (visible) { load(); setDrafts({}); } }, [visible, load]);

  const pending = items.filter((c) => c.status === 'pending');
  const earned = items.filter((c) => c.status === 'answered').reduce((s, c) => s + Number(c.price), 0);

  const handleAnswer = async (id: string) => {
    const txt = (drafts[id] || '').trim();
    if (!txt || busy) return;
    setBusy(id);
    try {
      await answerConsultation(id, txt);
      setDrafts((d) => { const n = { ...d }; delete n[id]; return n; });
      await load();
    } catch {}
    setBusy(null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { height: SCREEN_HEIGHT * 0.9 }]}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtnText}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: colors.text }]}>Consultas</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {pending.length > 0 ? `${pending.length} sin responder` : 'Consultas asincrónicas de tus pacientes'}
              {earned > 0 ? ` · ${money(earned)} generados` : ''}
            </Text>

            {items.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                Todavía no tenés consultas. Cuando un paciente te escriba una, aparece acá.
              </Text>
            ) : (
              items.map((c) => (
                <View key={c.id} style={[styles.item, c.status === 'pending' && { borderLeftWidth: 3, borderLeftColor: colors.primary }]}>
                  <View style={styles.itemHead}>
                    <Text style={[styles.who, { color: colors.text }]}>{c.patient_name}</Text>
                    <Text style={[styles.price, { color: colors.primary }]}>{money(Number(c.price))}</Text>
                  </View>
                  <Text style={[styles.date, { color: colors.textSecondary }]}>{when(c.created_at)}</Text>
                  <Text style={[styles.q, { color: colors.text }]}>{c.question}</Text>

                  {c.status === 'answered' ? (
                    <View style={[styles.answerBox, { backgroundColor: '#F3F1FB' }]}>
                      <Text style={[styles.answerLbl, { color: colors.textSecondary }]}>Tu respuesta</Text>
                      <Text style={[styles.answerBody, { color: colors.text }]}>{c.answer}</Text>
                    </View>
                  ) : (
                    <>
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="Escribí tu respuesta..."
                        placeholderTextColor={colors.textSecondary}
                        value={drafts[c.id] || ''}
                        onChangeText={(t) => setDrafts((d) => ({ ...d, [c.id]: t }))}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                      <TouchableOpacity
                        style={[styles.answerBtn, { backgroundColor: colors.primary, opacity: (drafts[c.id]?.trim() && busy !== c.id) ? 1 : 0.5 }]}
                        onPress={() => handleAnswer(c.id)}
                        disabled={!drafts[c.id]?.trim() || busy === c.id}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.answerBtnText}>{busy === c.id ? 'Enviando...' : 'Responder'}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ))
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
  subtitle: { fontSize: 14, fontFamily: 'Outfit_400Regular', marginTop: 4, marginBottom: 18 },
  empty: { fontSize: 14, fontFamily: 'Outfit_400Regular', lineHeight: 20 },
  item: { borderRadius: 16, backgroundColor: '#FBFAFE', padding: 16, marginBottom: 12 },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  who: { fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  price: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  date: { fontSize: 12, fontFamily: 'Outfit_400Regular', marginTop: 2, marginBottom: 8 },
  q: { fontSize: 15, fontFamily: 'Outfit_500Medium', lineHeight: 21 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, fontSize: 14, fontFamily: 'Outfit_400Regular', minHeight: 74, marginTop: 12, borderWidth: 1, borderColor: '#ECE9F5' },
  answerBtn: { borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 10 },
  answerBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  answerBox: { borderRadius: 12, padding: 12, marginTop: 12 },
  answerLbl: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  answerBody: { fontSize: 14, fontFamily: 'Outfit_400Regular', lineHeight: 21 },
});
