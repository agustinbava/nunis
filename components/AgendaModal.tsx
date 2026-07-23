import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, Dimensions,
} from 'react-native';
import { useTheme } from '../lib/theme-context';
import { getPsychSlots, createSlotsBulk, deleteSlot } from '../lib/database';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DURATIONS = [30, 45, 60];

function nextDays(n: number) {
  const out: { value: string; label: string; dow: string; dnum: string }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push({
      value: d.toISOString().split('T')[0],
      label: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'numeric' }),
      dow: d.toLocaleDateString('es-AR', { weekday: 'short' }).slice(0, 3),
      dnum: String(d.getDate()),
    });
  }
  return out;
}
function dayLabel(d: string) { try { return new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }); } catch { return d; } }
function timeToMin(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); }
function minToTime(m: number) { return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }

interface Props { visible: boolean; psychId: string; onClose: () => void; }

export default function AgendaModal({ visible, psychId, onClose }: Props) {
  const { colors } = useTheme();
  const [slots, setSlots] = useState<any[]>([]);
  const [duration, setDuration] = useState(45);
  const [startT, setStartT] = useState('09:00');
  const [endT, setEndT] = useState('18:00');
  const [selDate, setSelDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const days = nextDays(14);

  const load = useCallback(async () => {
    if (!psychId) return;
    try { setSlots(await getPsychSlots(psychId)); } catch { setSlots([]); }
  }, [psychId]);

  useEffect(() => { if (visible) { load(); setError(''); } }, [visible, load]);

  const daySlots = slots.filter((s) => s.slot_date === selDate).sort((a, b) => a.slot_time.localeCompare(b.slot_time));
  const countByDate: Record<string, number> = {};
  for (const s of slots) countByDate[s.slot_date] = (countByDate[s.slot_date] || 0) + 1;
  const bookedTotal = slots.filter((s) => s.slot_date >= days[0].value && s.status === 'booked').length;

  const generate = async () => {
    const s = timeToMin(startT), e = timeToMin(endT);
    if (!/^\d{1,2}:\d{2}$/.test(startT) || !/^\d{1,2}:\d{2}$/.test(endT) || s >= e) {
      setError('Revisá el horario (inicio antes que fin, formato HH:MM).');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const times: string[] = [];
      for (let t = s; t + duration <= e; t += duration) times.push(minToTime(t));
      const existing = new Set(daySlots.map((x) => x.slot_time));
      const toAdd = times.filter((t) => !existing.has(t)).map((t) => ({ slot_date: selDate, slot_time: t }));
      if (toAdd.length) await createSlotsBulk(psychId, toAdd);
      await load();
      if (!toAdd.length) setError('Ese día ya tiene esos horarios cargados.');
    } catch (e: any) { setError('No se pudo generar: ' + (e?.message ?? 'error')); }
    setBusy(false);
  };

  const removeSlot = async (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
    try { await deleteSlot(id); } catch { load(); }
  };
  const clearDayAvailable = async () => {
    const ids = daySlots.filter((s) => s.status === 'available').map((s) => s.id);
    setSlots((prev) => prev.filter((s) => !ids.includes(s.id)));
    for (const id of ids) { try { await deleteSlot(id); } catch {} }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { height: SCREEN_HEIGHT * 0.92 }]}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtnText}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: colors.text }]}>Agenda</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {bookedTotal > 0 ? `${bookedTotal} turno${bookedTotal !== 1 ? 's' : ''} reservado${bookedTotal !== 1 ? 's' : ''}` : 'Configurá tu horario y generá la disponibilidad.'}
            </Text>

            {/* Configuración */}
            <View style={[styles.configCard, { borderColor: '#ECE9F5' }]}>
              <Text style={[styles.cfgLabel, { color: colors.text }]}>Duración de sesión</Text>
              <View style={styles.durRow}>
                {DURATIONS.map((d) => {
                  const on = duration === d;
                  return (
                    <TouchableOpacity key={d} style={[styles.durChip, on ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.border }]} onPress={() => setDuration(d)} activeOpacity={0.7}>
                      <Text style={[styles.durChipText, { color: on ? '#FFFFFF' : colors.text }]}>{d} min</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.cfgLabel, { color: colors.text, marginTop: 14 }]}>Horario de atención</Text>
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Text style={[styles.timeFieldLbl, { color: colors.textSecondary }]}>Inicio</Text>
                  <TextInput style={[styles.timeInput, { color: colors.text }]} value={startT} onChangeText={setStartT} placeholder="09:00" placeholderTextColor={colors.textSecondary} keyboardType="numbers-and-punctuation" />
                </View>
                <View style={styles.timeField}>
                  <Text style={[styles.timeFieldLbl, { color: colors.textSecondary }]}>Fin</Text>
                  <TextInput style={[styles.timeInput, { color: colors.text }]} value={endT} onChangeText={setEndT} placeholder="18:00" placeholderTextColor={colors.textSecondary} keyboardType="numbers-and-punctuation" />
                </View>
              </View>
            </View>

            {/* Selector de día */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStrip}>
              {days.map((d) => {
                const on = selDate === d.value;
                const cnt = countByDate[d.value] || 0;
                return (
                  <TouchableOpacity key={d.value} style={[styles.dayCol, on && { backgroundColor: colors.primary }]} onPress={() => setSelDate(d.value)} activeOpacity={0.7}>
                    <Text style={[styles.dayColDow, { color: on ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>{d.dow}</Text>
                    <Text style={[styles.dayColNum, { color: on ? '#FFFFFF' : colors.text }]}>{d.dnum}</Text>
                    {cnt > 0 && <View style={[styles.dayDot, { backgroundColor: on ? '#FFFFFF' : colors.primary }]} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={[styles.genBtn, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]} onPress={generate} disabled={busy} activeOpacity={0.85}>
              <Text style={styles.genBtnText}>{busy ? 'Generando...' : `Generar disponibilidad · ${startT}–${endT}`}</Text>
            </TouchableOpacity>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* Vista del día */}
            <View style={styles.dayHead}>
              <Text style={[styles.dayTitle, { color: colors.text }]}>{dayLabel(selDate)}</Text>
              {daySlots.some((s) => s.status === 'available') && (
                <TouchableOpacity onPress={clearDayAvailable} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.clearLink, { color: colors.textSecondary }]}>Limpiar libres</Text>
                </TouchableOpacity>
              )}
            </View>
            {daySlots.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>Sin horarios este día. Tocá "Generar disponibilidad".</Text>
            ) : (
              daySlots.map((s) => (
                <View key={s.id} style={[styles.slot, s.status === 'booked' ? { backgroundColor: colors.accent } : { borderWidth: 1, borderColor: '#ECE9F5', backgroundColor: '#FFFFFF' }]}>
                  <Text style={[styles.slotTime, { color: s.status === 'booked' ? colors.primary : colors.text }]}>{s.slot_time}</Text>
                  <Text style={[styles.slotLabel, { color: s.status === 'booked' ? colors.text : colors.textSecondary }]}>
                    {s.status === 'booked' ? (s.patient_name || 'Reservado') : 'Disponible'}
                  </Text>
                  <View style={{ flex: 1 }} />
                  {s.status === 'available' && (
                    <TouchableOpacity onPress={() => removeSlot(s.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={[styles.slotX, { color: colors.textSecondary }]}>×</Text>
                    </TouchableOpacity>
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
  configCard: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 18 },
  cfgLabel: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', marginBottom: 10 },
  durRow: { flexDirection: 'row', gap: 8 },
  durChip: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  durChipText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeField: { flex: 1 },
  timeFieldLbl: { fontSize: 12, fontFamily: 'Outfit_500Medium', marginBottom: 5 },
  timeInput: { backgroundColor: '#f6f3f2', borderRadius: 12, padding: 13, fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
  dayStrip: { gap: 8, paddingBottom: 4, marginBottom: 12 },
  dayCol: { width: 54, paddingVertical: 10, borderRadius: 14, backgroundColor: '#F4F3FA', alignItems: 'center' },
  dayColDow: { fontSize: 11, fontFamily: 'Outfit_500Medium', textTransform: 'capitalize' },
  dayColNum: { fontSize: 18, fontFamily: 'Outfit_600SemiBold', marginTop: 2 },
  dayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 4 },
  genBtn: { borderRadius: 14, padding: 15, alignItems: 'center' },
  genBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  error: { fontSize: 13, fontFamily: 'Outfit_500Medium', color: '#E74C3C', marginTop: 10 },
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 10 },
  dayTitle: { fontSize: 16, fontFamily: 'PlayfairDisplay_700Bold', textTransform: 'capitalize' },
  clearLink: { fontSize: 12, fontFamily: 'Outfit_600SemiBold' },
  empty: { fontSize: 14, fontFamily: 'Outfit_400Regular' },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8 },
  slotTime: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', width: 48 },
  slotLabel: { fontSize: 14, fontFamily: 'Outfit_500Medium' },
  slotX: { fontSize: 22, fontFamily: 'Outfit_400Regular' },
});
