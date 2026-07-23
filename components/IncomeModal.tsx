import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';
import { createIncome, getPsychIncome, updateIncomeStatus, deleteIncome } from '../lib/database';
import ModalSheet from './ModalSheet';
import { AMBER_BG, AMBER_INK, TEAL, GREY_INK, HAIR, FIELD } from '../constants/palette';

function todayStr() { return new Date().toISOString().split('T')[0]; }
function thisMonth() { return new Date().toISOString().slice(0, 7); }
function genId() {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789'; let r = 'inc_';
  for (let i = 0; i < 16; i++) r += c[Math.floor(Math.random() * c.length)];
  return r;
}
function fmt(n: number) { return '$' + Math.round(n).toLocaleString('es-AR'); }
function fmtDate(d: string) {
  try { return new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }); }
  catch { return d; }
}

interface Patient { patient_id: string; name: string; }
interface Props { visible: boolean; psychId: string; patients: Patient[]; onClose: () => void; }

export default function IncomeModal({ visible, psychId, patients, onClose }: Props) {
  const { colors } = useTheme();
  const [records, setRecords] = useState<any[]>([]);
  const [selPatient, setSelPatient] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [paid, setPaid] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!psychId) return;
    try { setRecords(await getPsychIncome(psychId)); } catch { setRecords([]); }
  }, [psychId]);

  useEffect(() => {
    if (visible) { load(); setSelPatient(null); setAmount(''); setPaid(true); setError(''); }
  }, [visible, load]);

  const monthRecords = records.filter((r) => (r.session_date || '').startsWith(thisMonth()));
  const cobrado = monthRecords.filter((r) => r.status === 'paid').reduce((s, r) => s + Number(r.amount), 0);
  const pendiente = records.filter((r) => r.status === 'pending').reduce((s, r) => s + Number(r.amount), 0);
  const impagas = records.filter((r) => r.status === 'pending').length;

  const handleAdd = async () => {
    const amt = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!selPatient || !amt || amt <= 0) {
      setError('Elegí un paciente y un monto válido.');
      return;
    }
    setError('');
    try {
      await createIncome(genId(), psychId, selPatient, amt, todayStr(), paid ? 'paid' : 'pending', null);
      setAmount('');
      setSelPatient(null);
      await load();
    } catch (e: any) {
      setError('No se pudo registrar: ' + (e?.message ?? 'error'));
    }
  };

  const toggleStatus = async (r: any) => {
    const next = r.status === 'paid' ? 'pending' : 'paid';
    setRecords((prev) => prev.map((x) => x.id === r.id ? { ...x, status: next } : x));
    try { await updateIncomeStatus(r.id, next); } catch { load(); }
  };

  const remove = async (r: any) => {
    setRecords((prev) => prev.filter((x) => x.id !== r.id));
    try { await deleteIncome(r.id); } catch { load(); }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Ingresos"
      subtitle="Registrá lo que cobrás por sesión y seguí lo que queda pendiente."
      heightRatio={0.9}
    >
      {/* Resumen del mes */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.summaryLabelLight}>Cobrado este mes</Text>
          <Text style={styles.summaryValueLight}>{fmt(cobrado)}</Text>
          <Text style={styles.summarySubLight}>{monthRecords.filter(r => r.status === 'paid').length} sesiones</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: AMBER_BG }]}>
          <Text style={[styles.summaryLabel, { color: AMBER_INK }]}>Pendiente de cobro</Text>
          <Text style={[styles.summaryValue, { color: AMBER_INK }]}>{fmt(pendiente)}</Text>
          <Text style={[styles.summarySub, { color: AMBER_INK }]}>{impagas} impaga{impagas !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* Registrar */}
      <Text style={[styles.sectionLabel, { color: colors.text }]}>Registrar sesión</Text>
      {patients.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>No tenés pacientes vinculados.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.patientChips}>
          {patients.map((p) => {
            const on = selPatient === p.patient_id;
            return (
              <TouchableOpacity
                key={p.patient_id}
                style={[styles.chip, on ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: '#E5E1EE' }]}
                onPress={() => setSelPatient(p.patient_id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, { color: on ? '#FFFFFF' : colors.text }]}>{p.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.addRow}>
        <TextInput
          style={[styles.amountInput, { color: colors.text }]}
          placeholder="$ Monto"
          placeholderTextColor={GREY_INK}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />
        <TouchableOpacity
          style={[styles.statusToggle, { backgroundColor: paid ? TEAL + '1F' : AMBER_BG }]}
          onPress={() => setPaid((v) => !v)}
          activeOpacity={0.7}
        >
          <Ionicons name={paid ? 'checkmark-circle' : 'time-outline'} size={16} color={paid ? TEAL : AMBER_INK} />
          <Text style={[styles.statusToggleText, { color: paid ? TEAL : AMBER_INK }]}>{paid ? 'Pagado' : 'Pendiente'}</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={handleAdd} activeOpacity={0.85}>
        <Text style={styles.addBtnText}>Registrar</Text>
      </TouchableOpacity>

      {/* Historial */}
      {records.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 26 }]}>Historial</Text>
          {records.map((r) => {
            const isPaid = r.status === 'paid';
            return (
              <View key={r.id} style={styles.recordRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.recordName, { color: colors.text }]} numberOfLines={1}>{r.patient_name}</Text>
                  <Text style={[styles.recordDate, { color: GREY_INK }]}>{fmtDate(r.session_date)}</Text>
                </View>
                <Text style={[styles.recordAmount, { color: colors.text }]}>{fmt(Number(r.amount))}</Text>
                <TouchableOpacity
                  style={[styles.recordStatus, { backgroundColor: isPaid ? TEAL + '1F' : AMBER_BG }]}
                  onPress={() => toggleStatus(r)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.recordStatusText, { color: isPaid ? TEAL : AMBER_INK }]}>{isPaid ? 'Pagado' : 'Cobrar'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(r)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={17} color={GREY_INK} />
                </TouchableOpacity>
              </View>
            );
          })}
        </>
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 26 },
  summaryCard: { flex: 1, borderRadius: 20, padding: 18 },
  summaryLabel: { fontSize: 12, fontFamily: 'Outfit_600SemiBold' },
  summaryLabelLight: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: 'rgba(255,255,255,0.85)' },
  summaryValue: { fontSize: 26, fontFamily: 'PlayfairDisplay_700Bold', marginTop: 6 },
  summaryValueLight: { fontSize: 26, fontFamily: 'PlayfairDisplay_700Bold', color: '#FFFFFF', marginTop: 6 },
  summarySub: { fontSize: 12, fontFamily: 'Outfit_400Regular', marginTop: 2 },
  summarySubLight: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  sectionLabel: { fontSize: 17, fontFamily: 'PlayfairDisplay_700Bold', marginBottom: 10 },
  empty: { fontSize: 14, fontFamily: 'Outfit_400Regular', marginBottom: 10 },
  patientChips: { gap: 8, paddingBottom: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9999, borderWidth: 1, backgroundColor: '#FFFFFF' },
  chipText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  addRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  amountInput: { flex: 1, backgroundColor: FIELD, borderRadius: 14, padding: 14, fontSize: 16, fontFamily: 'Outfit_500Medium' },
  statusToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 16, justifyContent: 'center' },
  statusToggleText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  error: { fontSize: 13, fontFamily: 'Outfit_500Medium', color: '#D9534F', marginTop: 10 },
  addBtn: { borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 12 },
  addBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: HAIR },
  recordName: { fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  recordDate: { fontSize: 12, fontFamily: 'Outfit_400Regular', marginTop: 2 },
  recordAmount: { fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  recordStatus: { borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6 },
  recordStatusText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold' },
});
