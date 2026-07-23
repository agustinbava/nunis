import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, Dimensions,
} from 'react-native';
import { useTheme } from '../lib/theme-context';
import { createSlot, getPsychSlots, deleteSlot } from '../lib/database';

const SCREEN_HEIGHT = Dimensions.get('window').height;

function nextDays(n: number) {
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const value = d.toISOString().split('T')[0];
    const label = i === 0 ? 'Hoy' : i === 1 ? 'Mañana'
      : d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'numeric' });
    out.push({ value, label });
  }
  return out;
}
function dayLabel(d: string) {
  try { return new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }); }
  catch { return d; }
}
function genId() { const c = 'abcdefghijklmnopqrstuvwxyz0123456789'; let r = 'appt_'; for (let i = 0; i < 14; i++) r += c[Math.floor(Math.random() * c.length)]; return r; }

interface Props { visible: boolean; psychId: string; onClose: () => void; }

export default function AgendaModal({ visible, psychId, onClose }: Props) {
  const { colors } = useTheme();
  const [slots, setSlots] = useState<any[]>([]);
  const [selDate, setSelDate] = useState<string | null>(null);
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const days = nextDays(14);

  const load = useCallback(async () => {
    if (!psychId) return;
    try { setSlots(await getPsychSlots(psychId)); } catch { setSlots([]); }
  }, [psychId]);

  useEffect(() => { if (visible) { load(); setSelDate(null); setTime(''); setError(''); } }, [visible, load]);

  const handlePublish = async () => {
    const t = time.trim();
    if (!selDate || !/^\d{1,2}:\d{2}$/.test(t)) {
      setError('Elegí un día y una hora válida (ej: 15:00).');
      return;
    }
    setError('');
    try {
      const hh = t.padStart(5, '0');
      await createSlot(genId(), psychId, selDate, hh);
      setTime('');
      await load();
    } catch (e: any) { setError('No se pudo publicar: ' + (e?.message ?? 'error')); }
  };

  const handleDelete = async (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
    try { await deleteSlot(id); } catch { load(); }
  };

  // agrupar por fecha (solo futuros/hoy)
  const todayStr = new Date().toISOString().split('T')[0];
  const upcoming = slots.filter((s) => s.slot_date >= todayStr);
  const grouped: Record<string, any[]> = {};
  for (const s of upcoming) { (grouped[s.slot_date] = grouped[s.slot_date] || []).push(s); }
  const dates = Object.keys(grouped).sort();
  const bookedCount = upcoming.filter((s) => s.status === 'booked').length;

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
            <Text style={[styles.title, { color: colors.text }]}>Agenda</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {bookedCount > 0 ? `${bookedCount} turno${bookedCount !== 1 ? 's' : ''} reservado${bookedCount !== 1 ? 's' : ''}` : 'Publicá horarios para que tus pacientes reserven.'}
            </Text>

            {/* Publicar horario */}
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Publicar horario</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayChips}>
              {days.map((d) => {
                const on = selDate === d.value;
                return (
                  <TouchableOpacity
                    key={d.value}
                    style={[styles.dayChip, on ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.border }]}
                    onPress={() => setSelDate(d.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayChipText, { color: on ? '#FFFFFF' : colors.text }]}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.addRow}>
              <TextInput
                style={[styles.timeInput, { color: colors.text }]}
                placeholder="Hora (ej: 15:00)"
                placeholderTextColor={colors.textSecondary}
                value={time}
                onChangeText={setTime}
                keyboardType="numbers-and-punctuation"
              />
              <TouchableOpacity style={[styles.publishBtn, { backgroundColor: colors.primary }]} onPress={handlePublish} activeOpacity={0.85}>
                <Text style={styles.publishBtnText}>Publicar</Text>
              </TouchableOpacity>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* Próximos turnos */}
            <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 24 }]}>Próximos</Text>
            {dates.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>No tenés horarios publicados.</Text>
            ) : (
              dates.map((date) => (
                <View key={date} style={{ marginBottom: 14 }}>
                  <Text style={[styles.dateHeader, { color: colors.primary }]}>{dayLabel(date)}</Text>
                  {grouped[date].map((s) => (
                    <View key={s.id} style={styles.slotRow}>
                      <Text style={[styles.slotTime, { color: colors.text }]}>{s.slot_time}</Text>
                      {s.status === 'booked' ? (
                        <View style={[styles.slotTag, { backgroundColor: colors.accent }]}>
                          <Text style={[styles.slotTagText, { color: colors.primary }]}>{s.patient_name || 'Reservado'}</Text>
                        </View>
                      ) : (
                        <View style={[styles.slotTag, { backgroundColor: '#EFEDF6' }]}>
                          <Text style={[styles.slotTagText, { color: colors.textSecondary }]}>Disponible</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }} />
                      <TouchableOpacity onPress={() => handleDelete(s.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={[styles.deleteX, { color: colors.textSecondary }]}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
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
  subtitle: { fontSize: 14, fontFamily: 'Outfit_400Regular', marginTop: 4, marginBottom: 20 },
  sectionLabel: { fontSize: 16, fontFamily: 'PlayfairDisplay_700Bold', marginBottom: 10 },
  dayChips: { gap: 8, paddingBottom: 4 },
  dayChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9999, borderWidth: 1, backgroundColor: '#FFFFFF' },
  dayChipText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', textTransform: 'capitalize' },
  addRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  timeInput: { flex: 1, backgroundColor: '#f6f3f2', borderRadius: 14, padding: 14, fontSize: 16, fontFamily: 'Outfit_500Medium' },
  publishBtn: { borderRadius: 14, paddingHorizontal: 22, justifyContent: 'center', alignItems: 'center' },
  publishBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  error: { fontSize: 13, fontFamily: 'Outfit_500Medium', color: '#E74C3C', marginTop: 10 },
  empty: { fontSize: 14, fontFamily: 'Outfit_400Regular' },
  dateHeader: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', textTransform: 'capitalize', marginBottom: 6 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F2F0F7' },
  slotTime: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', width: 52 },
  slotTag: { borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 5 },
  slotTagText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold' },
  deleteX: { fontSize: 22, fontFamily: 'Outfit_400Regular', paddingHorizontal: 4 },
});
