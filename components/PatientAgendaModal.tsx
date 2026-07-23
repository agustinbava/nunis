import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../lib/theme-context';
import { getPatientAppointments, bookSlot, cancelSlot } from '../lib/database';

const SCREEN_HEIGHT = Dimensions.get('window').height;

function dayLabel(d: string) {
  try { return new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }); }
  catch { return d; }
}

interface Props { visible: boolean; patientId: string; onClose: () => void; }

export default function PatientAgendaModal({ visible, patientId, onClose }: Props) {
  const { colors } = useTheme();
  const [appts, setAppts] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!patientId) return;
    try { setAppts(await getPatientAppointments(patientId)); } catch { setAppts([]); }
  }, [patientId]);

  useEffect(() => { if (visible) load(); }, [visible, load]);

  const todayStr = new Date().toISOString().split('T')[0];
  const upcoming = appts.filter((a) => a.slot_date >= todayStr);
  const mine = upcoming.filter((a) => a.status === 'booked' && a.patient_id === patientId);
  const available = upcoming.filter((a) => a.status === 'available');

  const grouped: Record<string, any[]> = {};
  for (const a of available) { (grouped[a.slot_date] = grouped[a.slot_date] || []).push(a); }
  const dates = Object.keys(grouped).sort();

  const handleBook = async (id: string) => {
    setBusy(id);
    try { await bookSlot(id, patientId); await load(); } catch {}
    setBusy(null);
  };
  const handleCancel = async (id: string) => {
    setBusy(id);
    try { await cancelSlot(id); await load(); } catch {}
    setBusy(null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { height: SCREEN_HEIGHT * 0.85 }]}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtnText}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: colors.text }]}>Turnos</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {appts[0]?.psych_name ? `Con ${appts[0].psych_name}` : 'Reservá con tu profesional'}
            </Text>

            {mine.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Mis turnos</Text>
                {mine.map((a) => (
                  <View key={a.id} style={[styles.mineCard, { backgroundColor: colors.accent }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.mineDate, { color: colors.text }]}>{dayLabel(a.slot_date)}</Text>
                      <Text style={[styles.mineTime, { color: colors.primary }]}>{a.slot_time} hs</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.cancelBtn, { borderColor: colors.danger }]}
                      onPress={() => handleCancel(a.id)}
                      disabled={busy === a.id}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.cancelBtnText, { color: colors.danger }]}>{busy === a.id ? '...' : 'Cancelar'}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            <Text style={[styles.sectionLabel, { color: colors.text, marginTop: mine.length ? 22 : 0 }]}>Horarios disponibles</Text>
            {dates.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                Tu profesional todavía no publicó horarios. Cuando lo haga, vas a poder reservar acá.
              </Text>
            ) : (
              dates.map((date) => (
                <View key={date} style={{ marginBottom: 14 }}>
                  <Text style={[styles.dateHeader, { color: colors.primary }]}>{dayLabel(date)}</Text>
                  <View style={styles.slotWrap}>
                    {grouped[date].map((a) => (
                      <TouchableOpacity
                        key={a.id}
                        style={[styles.slotPill, { borderColor: colors.primary }]}
                        onPress={() => handleBook(a.id)}
                        disabled={busy === a.id}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.slotPillText, { color: colors.primary }]}>{busy === a.id ? '...' : `${a.slot_time} hs`}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
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
  subtitle: { fontSize: 14, fontFamily: 'Outfit_400Regular', marginTop: 4, marginBottom: 22, textTransform: 'capitalize' },
  sectionLabel: { fontSize: 16, fontFamily: 'PlayfairDisplay_700Bold', marginBottom: 10 },
  empty: { fontSize: 14, fontFamily: 'Outfit_400Regular', lineHeight: 20 },
  mineCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 10 },
  mineDate: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', textTransform: 'capitalize' },
  mineTime: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', marginTop: 2 },
  cancelBtn: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9 },
  cancelBtnText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  dateHeader: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', textTransform: 'capitalize', marginBottom: 8 },
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotPill: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF' },
  slotPillText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
});
