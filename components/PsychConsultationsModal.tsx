import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';
import { getPsychConsultations, answerConsultation } from '../lib/database';
import ModalSheet from './ModalSheet';
import { AMBER, AMBER_BG, AMBER_INK, TEAL, GREY_INK } from '../constants/palette';

function money(n: number) { return '$' + Math.round(n).toLocaleString('es-AR'); }
function when(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

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

  const subtitle = [
    pending.length > 0 ? `${pending.length} sin responder` : 'Consultas asincrónicas de tus pacientes',
    earned > 0 ? `${money(earned)} generados` : '',
  ].filter(Boolean).join(' · ');

  return (
    <ModalSheet visible={visible} onClose={onClose} title="Consultas" subtitle={subtitle} heightRatio={0.9}>
      {items.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          Todavía no tenés consultas. Cuando un paciente te escriba una, aparece acá.
        </Text>
      ) : (
        items.map((c) => {
          const isPending = c.status === 'pending';
          return (
            <View key={c.id} style={[styles.item, isPending && { borderLeftWidth: 3, borderLeftColor: AMBER }]}>
              <View style={styles.itemHead}>
                <Text style={[styles.who, { color: colors.text }]} numberOfLines={1}>{c.patient_name}</Text>
                <View style={styles.headRight}>
                  {isPending ? (
                    <View style={[styles.pill, { backgroundColor: AMBER_BG }]}>
                      <Text style={[styles.pillText, { color: AMBER_INK }]}>Pendiente</Text>
                    </View>
                  ) : (
                    <View style={[styles.pill, { backgroundColor: TEAL + '1F' }]}>
                      <Text style={[styles.pillText, { color: TEAL }]}>Respondida</Text>
                    </View>
                  )}
                  <Text style={[styles.price, { color: colors.primary }]}>{money(Number(c.price))}</Text>
                </View>
              </View>
              <Text style={[styles.date, { color: GREY_INK }]}>{when(c.created_at)}</Text>
              <Text style={[styles.q, { color: colors.text }]}>{c.question}</Text>

              {c.status === 'answered' ? (
                <View style={[styles.answerBox, { backgroundColor: colors.primary + '0D' }]}>
                  <Text style={[styles.answerLbl, { color: colors.primary }]}>Tu respuesta</Text>
                  <Text style={[styles.answerBody, { color: colors.text }]}>{c.answer}</Text>
                </View>
              ) : (
                <>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Escribí tu respuesta..."
                    placeholderTextColor={GREY_INK}
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
                    <Ionicons name="send" size={15} color="#FFFFFF" />
                    <Text style={styles.answerBtnText}>{busy === c.id ? 'Enviando...' : 'Responder'}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          );
        })
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 14, fontFamily: 'Outfit_400Regular', lineHeight: 21 },
  item: { borderRadius: 18, backgroundColor: '#FBFAFE', padding: 16, marginBottom: 12 },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  who: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', flexShrink: 1 },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  pillText: { fontSize: 10.5, fontFamily: 'Outfit_600SemiBold' },
  price: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  date: { fontSize: 12, fontFamily: 'Outfit_400Regular', marginTop: 4, marginBottom: 8 },
  q: { fontSize: 15, fontFamily: 'Outfit_500Medium', lineHeight: 21 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 13, fontSize: 14, fontFamily: 'Outfit_400Regular', minHeight: 74, marginTop: 12, borderWidth: 1, borderColor: '#ECE9F5' },
  answerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 14, padding: 12, marginTop: 10 },
  answerBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  answerBox: { borderRadius: 14, padding: 13, marginTop: 12 },
  answerLbl: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  answerBody: { fontSize: 14, fontFamily: 'Outfit_400Regular', lineHeight: 21 },
});
