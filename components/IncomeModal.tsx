import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, Dimensions,
} from 'react-native';
import { useTheme } from '../lib/theme-context';
import { createIncome, getPsychIncome, updateIncomeStatus, deleteIncome } from '../lib/database';

const SCREEN_HEIGHT = Dimensions.get('window').height;

function todayStr() { return new Date().toISOString().split('T')[0]; }
function thisMonth() { return new Date().toISOString().slice(0, 7); } // YYYY-MM
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
interface Props {
  visible: boolean;
  psychId: string;
  patients: Patient[];
  onClose: () => void;
}

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
            <Text style={[styles.title, { color: colors.text }]}>Ingresos</Text>

            {/* Resumen del mes */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
                <Text style={styles.summaryLabelLight}>Cobrado este mes</Text>
                <Text style={styles.summaryValueLight}>{fmt(cobrado)}</Text>
                <Text style={styles.summarySubLight}>{monthRecords.filter(r => r.status === 'paid').length} sesiones</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#FFF3E9' }]}>
                <Text style={[styles.summaryLabel, { color: '#B5651D' }]}>Pendiente de cobro</Text>
                <Text style={[styles.summaryValue, { color: '#B5651D' }]}>{fmt(pendiente)}</Text>
                <Text style={[styles.summarySub, { color: '#B5651D' }]}>{impagas} impaga{impagas !== 1 ? 's' : ''}</Text>
              </View>
            </View>

            {/* Agregar registro */}
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
                      style={[styles.chip, on ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.border }]}
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
                placeholderTextColor={colors.textSecondary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={[styles.statusToggle, { backgroundColor: paid ? '#E8F5E9' : '#FFF3E9' }]}
                onPress={() => setPaid((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={[styles.statusToggleText, { color: paid ? colors.success : '#B5651D' }]}>
                  {paid ? 'Pagado' : 'Pendiente'}
                </Text>
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={handleAdd} activeOpacity={0.85}>
              <Text style={styles.addBtnText}>Registrar</Text>
            </TouchableOpacity>

            {/* Lista */}
            {records.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 24 }]}>Historial</Text>
                {records.map((r) => (
                  <View key={r.id} style={styles.recordRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.recordName, { color: colors.text }]}>{r.patient_name}</Text>
                      <Text style={[styles.recordDate, { color: colors.textSecondary }]}>{fmtDate(r.session_date)}</Text>
                    </View>
                    <Text style={[styles.recordAmount, { color: colors.text }]}>{fmt(Number(r.amount))}</Text>
                    <TouchableOpacity
                      style={[styles.recordStatus, { backgroundColor: r.status === 'paid' ? '#E8F5E9' : '#FFF3E9' }]}
                      onPress={() => toggleStatus(r)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.recordStatusText, { color: r.status === 'paid' ? colors.success : '#B5651D' }]}>
                        {r.status === 'paid' ? 'Pagado' : 'Cobrar'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => remove(r)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={[styles.deleteX, { color: colors.textSecondary }]}>×</Text>
                    </TouchableOpacity>
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
  title: { fontSize: 24, fontFamily: 'PlayfairDisplay_700Bold', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryCard: { flex: 1, borderRadius: 20, padding: 18 },
  summaryLabel: { fontSize: 12, fontFamily: 'Outfit_600SemiBold' },
  summaryLabelLight: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: 'rgba(255,255,255,0.85)' },
  summaryValue: { fontSize: 26, fontFamily: 'PlayfairDisplay_700Bold', marginTop: 6 },
  summaryValueLight: { fontSize: 26, fontFamily: 'PlayfairDisplay_700Bold', color: '#FFFFFF', marginTop: 6 },
  summarySub: { fontSize: 12, fontFamily: 'Outfit_400Regular', marginTop: 2 },
  summarySubLight: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  sectionLabel: { fontSize: 16, fontFamily: 'PlayfairDisplay_700Bold', marginBottom: 10 },
  empty: { fontSize: 14, fontFamily: 'Outfit_400Regular', marginBottom: 10 },
  patientChips: { gap: 8, paddingBottom: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9999, borderWidth: 1, backgroundColor: '#FFFFFF' },
  chipText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  addRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  amountInput: { flex: 1, backgroundColor: '#f6f3f2', borderRadius: 14, padding: 14, fontSize: 16, fontFamily: 'Outfit_500Medium' },
  statusToggle: { borderRadius: 14, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center' },
  statusToggleText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  error: { fontSize: 13, fontFamily: 'Outfit_500Medium', color: '#E74C3C', marginTop: 10 },
  addBtn: { borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 12 },
  addBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F0F7' },
  recordName: { fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  recordDate: { fontSize: 12, fontFamily: 'Outfit_400Regular', marginTop: 2 },
  recordAmount: { fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  recordStatus: { borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6 },
  recordStatusText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold' },
  deleteX: { fontSize: 22, fontFamily: 'Outfit_400Regular', paddingHorizontal: 4 },
});
