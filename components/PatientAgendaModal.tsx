import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';
import { getPatientAppointments, bookSlot, cancelSlot } from '../lib/database';
import ModalSheet from './ModalSheet';
import { CORAL, GREY_INK } from '../constants/palette';

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
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Turnos"
      subtitle={appts[0]?.psych_name ? `Con ${appts[0].psych_name}` : 'Reservá con tu profesional'}
      heightRatio={0.85}
    >
      {mine.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Mis turnos</Text>
          {mine.map((a) => (
            <View key={a.id} style={[styles.mineCard, { backgroundColor: colors.accent }]}>
              <View style={[styles.mineIcon, { backgroundColor: '#FFFFFF' }]}>
                <Ionicons name="calendar" size={17} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.mineDate, { color: colors.text }]}>{dayLabel(a.slot_date)}</Text>
                <Text style={[styles.mineTime, { color: colors.primary }]}>{a.slot_time} hs</Text>
              </View>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: CORAL }]}
                onPress={() => handleCancel(a.id)}
                disabled={busy === a.id}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelBtnText, { color: CORAL }]}>{busy === a.id ? '...' : 'Cancelar'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      <Text style={[styles.sectionLabel, { color: colors.text, marginTop: mine.length ? 24 : 0 }]}>Horarios disponibles</Text>
      {dates.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          Tu profesional todavía no publicó horarios. Cuando lo haga, vas a poder reservar acá.
        </Text>
      ) : (
        dates.map((date) => (
          <View key={date} style={{ marginBottom: 16 }}>
            <Text style={styles.dateHeader}>{dayLabel(date)}</Text>
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
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 17, fontFamily: 'PlayfairDisplay_700Bold', marginBottom: 10 },
  empty: { fontSize: 14, fontFamily: 'Outfit_400Regular', lineHeight: 21 },
  mineCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 14, marginBottom: 10 },
  mineIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mineDate: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', textTransform: 'capitalize' },
  mineTime: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', marginTop: 2 },
  cancelBtn: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  cancelBtnText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  dateHeader: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: GREY_INK, textTransform: 'capitalize', letterSpacing: 0.4, marginBottom: 9 },
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotPill: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF' },
  slotPillText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
});
