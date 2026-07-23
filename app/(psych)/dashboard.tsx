import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme-context';
import { useAuth } from '../../lib/auth-context';
import { getPsychPatients, getMoodEntries } from '../../lib/database';
import { moodScoreToColor } from '../../constants/themes';
import BroadcastModal from '../../components/BroadcastModal';
import IncomeModal from '../../components/IncomeModal';
import AgendaModal from '../../components/AgendaModal';
import PsychConsultationsModal from '../../components/PsychConsultationsModal';
import Avatar from '../../components/Avatar';
import { pickAndUploadAvatar } from '../../lib/avatar';

import { AMBER, AMBER_BG, AMBER_INK, CORAL, GREY_BADGE_BG, GREY_INK } from '../../constants/palette';

function firstName(name?: string | null) {
  return (name || '').trim().split(/\s+/)[0] || '';
}

function todayString() {
  return new Date().toISOString().split('T')[0];
}

function longDate() {
  try {
    const s = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch { return ''; }
}

function formatLastEntry(entry: any): string {
  if (!entry) return 'Sin registros';
  const d = new Date(entry.date + 'T12:00:00');
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  return `Hace ${diffDays} días`;
}

function patientBadge(data: any): { label: string; bg: string; ink: string } | null {
  const alerts = data?.alertDetails || [];
  if (alerts.some((a: any) => a.severity === 'critical')) return { label: 'Ánimo bajo', bg: AMBER_BG, ink: AMBER_INK };
  if (alerts.some((a: any) => a.text?.toLowerCase().includes('sin registros'))) return { label: 'Inactivo', bg: GREY_BADGE_BG, ink: GREY_INK };
  return null;
}

async function copyToClipboard(text: string) {
  if (Platform.OS === 'web') {
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
  }
  try { require('react-native').Clipboard.setString(text); return true; } catch { return false; }
}

export default function PsychDashboardScreen() {
  const { colors } = useTheme();
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [patientData, setPatientData] = useState<{ [key: string]: any }>({});
  const [filter, setFilter] = useState<'todos' | 'urgentes'>('todos');
  const [copied, setCopied] = useState(false);
  const [broadcastVisible, setBroadcastVisible] = useState(false);
  const [incomeVisible, setIncomeVisible] = useState(false);
  const [agendaVisible, setAgendaVisible] = useState(false);
  const [consultVisible, setConsultVisible] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const handleAvatarPress = async () => {
    if (!user || avatarLoading) return;
    setAvatarLoading(true);
    try {
      const url = await pickAndUploadAvatar(user.id);
      if (url) await refreshUser();
    } catch (e: any) {
      Alert.alert('No se pudo subir la foto', e?.message ?? 'Intentá de nuevo.');
    }
    setAvatarLoading(false);
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    const pts = await getPsychPatients(user.id);
    setPatients(pts);

    const data: { [key: string]: any } = {};
    for (const p of pts) {
      const entries = await getMoodEntries(p.patient_id, 7);
      const avg = entries.length > 0 ? entries.reduce((s: number, e: any) => s + e.score, 0) / entries.length : 0;
      const last = entries.length > 0 ? entries[0] : null;
      const trend = entries.length >= 2 ? entries[0].score - entries[entries.length - 1].score : 0;

      const alertDetails: { text: string; severity: 'critical' | 'warning' }[] = [];
      const lowDays = entries.filter((e: any) => e.score <= 3).length;
      if (lowDays >= 3) alertDetails.push({ text: `${lowDays} días con ánimo bajo esta semana`, severity: 'critical' });

      if (last) {
        const diffDays = Math.floor((Date.now() - new Date(last.date + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 3) alertDetails.push({ text: `Sin registros hace ${diffDays} días`, severity: 'warning' });
      } else if (entries.length === 0) {
        alertDetails.push({ text: 'Sin registros recientes', severity: 'warning' });
      }

      if (last && avg > 0) {
        const drop = avg - last.score;
        if (drop >= 3) alertDetails.push({ text: `Caída abrupta: ${last.score} vs promedio ${avg.toFixed(1)}`, severity: 'critical' });
      }

      data[p.patient_id] = { entries, avg: Math.round(avg * 10) / 10, last, trend, alertDetails };
    }
    setPatientData(data);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLogout = async () => {
    await logout();
    if (Platform.OS === 'web') window.location.assign('/');
    else router.replace('/');
  };

  const handleCopy = async () => {
    if (user?.share_code && await copyToClipboard(user.share_code)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const today = todayString();
  const loggedToday = patients.filter((p) => patientData[p.patient_id]?.last?.date === today).length;
  const alertPatients = patients.filter((p) => (patientData[p.patient_id]?.alertDetails?.length || 0) > 0);

  const attentionRows = alertPatients.slice(0, 4).map((p) => {
    const alerts = patientData[p.patient_id].alertDetails;
    const top = alerts.find((a: any) => a.severity === 'critical') || alerts[0];
    return { patient: p, alert: top };
  });

  const filteredPatients = filter === 'urgentes'
    ? patients.filter((p) => (patientData[p.patient_id]?.alertDetails?.length || 0) > 0)
    : patients;

  const QUICK = [
    { icon: 'calendar-outline', label: 'Agenda', onPress: () => setAgendaVisible(true), disabled: false },
    { icon: 'wallet-outline', label: 'Ingresos', onPress: () => setIncomeVisible(true), disabled: false },
    { icon: 'chatbubbles-outline', label: 'Consultas', onPress: () => setConsultVisible(true), disabled: false },
    { icon: 'paper-plane-outline', label: 'Mensajes', onPress: () => setBroadcastVisible(true), disabled: patients.length === 0 },
  ] as const;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.hello, { color: colors.text }]} numberOfLines={1}>
              Hola{firstName(user?.name) ? `, ${firstName(user?.name)}` : ''}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{longDate()}</Text>
          </View>
          <Avatar url={user?.avatar_url} name={user?.name} size={48} onPress={handleAvatarPress} editable loading={avatarLoading} />
        </View>

        {/* Stats strip */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: colors.text }]}>{patients.length}</Text>
            <Text style={styles.statLbl}>Pacientes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: colors.text }]}>{loggedToday}</Text>
            <Text style={styles.statLbl}>Registros hoy</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: alertPatients.length > 0 ? AMBER_INK : colors.text }]}>{alertPatients.length}</Text>
            <Text style={styles.statLbl}>Alertas</Text>
          </View>
        </View>

        {/* Atención */}
        {attentionRows.length > 0 && (
          <View style={styles.attnCard}>
            <View style={styles.attnHead}>
              <View style={styles.attnHeadDot} />
              <Text style={styles.attnHeadText}>ATENCIÓN</Text>
            </View>
            {attentionRows.map(({ patient, alert }, i) => (
              <TouchableOpacity
                key={patient.id}
                style={[styles.attnRow, i === 0 && { borderTopWidth: 0 }]}
                onPress={() => router.push(`/(psych)/patient/${patient.patient_id}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.attnDot, { backgroundColor: alert.severity === 'critical' ? CORAL : '#B9B3C4' }]} />
                <Text style={styles.attnText} numberOfLines={1}>
                  <Text style={styles.attnName}>{firstName(patient.name)}</Text>
                  <Text style={styles.attnMuted}>{`  ·  ${alert.text}`}</Text>
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#C9B48C" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Acciones rápidas */}
        <View style={styles.actionsRow}>
          {QUICK.map((a) => (
            <TouchableOpacity key={a.label} style={[styles.act, a.disabled && { opacity: 0.45 }]} onPress={a.onPress} disabled={a.disabled} activeOpacity={0.8}>
              <View style={[styles.actIcon, { backgroundColor: colors.accent }]}>
                <Ionicons name={a.icon as any} size={20} color={colors.primary} />
              </View>
              <Text style={[styles.actLabel, { color: colors.text }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Código de vinculación (compacto) */}
        <View style={styles.codePill}>
          <View style={{ flex: 1 }}>
            <Text style={styles.codeLbl}>CÓDIGO DE VINCULACIÓN</Text>
            <Text style={[styles.codeVal, { color: colors.primary }]}>{user?.share_code || '------'}</Text>
          </View>
          <TouchableOpacity onPress={handleCopy} style={[styles.copyBtn, { borderColor: colors.primary }]} activeOpacity={0.7}>
            <Text style={[styles.copyBtnText, { color: colors.primary }]}>{copied ? 'Copiado' : 'Copiar'}</Text>
          </TouchableOpacity>
        </View>

        {/* Tus pacientes */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tus pacientes</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity style={[styles.filterTab, filter === 'todos' && { backgroundColor: '#FFFFFF' }]} onPress={() => setFilter('todos')}>
              <Text style={[styles.filterTabText, { color: filter === 'todos' ? colors.text : colors.textSecondary }]}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterTab, filter === 'urgentes' && { backgroundColor: AMBER_BG }]} onPress={() => setFilter('urgentes')}>
              <Text style={[styles.filterTabText, { color: filter === 'urgentes' ? AMBER_INK : colors.textSecondary }]}>Urgentes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {filteredPatients.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filter === 'urgentes'
                ? 'Ningún paciente con alertas. Todo tranquilo.'
                : `Aún no tenés pacientes vinculados.\n\nCompartí tu código ${user?.share_code || ''} para que se vinculen desde su app.`}
            </Text>
          </View>
        ) : (
          filteredPatients.map((p) => {
            const data = patientData[p.patient_id] || {};
            const badge = patientBadge(data);
            const dotColor = data.last ? moodScoreToColor(data.last.score, colors) : '#C4BFCE';
            const spark = (data.entries || []).slice().reverse();
            return (
              <TouchableOpacity
                key={p.id}
                style={styles.pcard}
                onPress={() => router.push(`/(psych)/patient/${p.patient_id}`)}
                activeOpacity={0.7}
              >
                <Avatar url={p.avatar_url} name={p.name} size={46} />
                <View style={styles.pinfo}>
                  <View style={styles.pnameRow}>
                    <Text style={[styles.pname, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
                    {badge && (
                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.badgeText, { color: badge.ink }]}>{badge.label}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.pmeta}>
                    {spark.length > 0 ? (
                      <View style={styles.spark}>
                        {spark.map((e: any, i: number) => (
                          <View key={i} style={[styles.sparkBar, { height: Math.max(5, (e.score / 10) * 22), backgroundColor: moodScoreToColor(e.score, colors) }]} />
                        ))}
                      </View>
                    ) : <View style={{ width: 4 }} />}
                    <Text style={styles.plast}>{formatLastEntry(data.last)}</Text>
                  </View>
                </View>
                <View style={styles.pright}>
                  <View style={[styles.mood, { backgroundColor: dotColor }]} />
                  <Ionicons name="chevron-forward" size={17} color="#C7C3D0" />
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Nunis Pro (secundario, al final) */}
        <View style={[styles.upsellCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.upsellTitle}>Desbloqueá Nunis Pro</Text>
          <Text style={styles.upsellBody}>
            Análisis de sentimiento avanzados, reportes mensuales detallados y gestión ilimitada de pacientes.
          </Text>
          <View style={styles.upsellFooter}>
            <Text style={styles.upsellPrice}>$15/mes</Text>
            <TouchableOpacity style={styles.upsellButton} activeOpacity={0.8}>
              <Text style={[styles.upsellButtonText, { color: colors.primary }]}>Actualizar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutLink} activeOpacity={0.7}>
          <Text style={[styles.logoutText, { color: colors.textSecondary }]}>Cerrar sesión</Text>
        </TouchableOpacity>

      </ScrollView>

      <BroadcastModal visible={broadcastVisible} psychId={user?.id || ''} patients={patients.map((p: any) => ({ patient_id: p.patient_id, name: p.name }))} onClose={() => setBroadcastVisible(false)} />
      <IncomeModal visible={incomeVisible} psychId={user?.id || ''} patients={patients.map((p: any) => ({ patient_id: p.patient_id, name: p.name }))} onClose={() => setIncomeVisible(false)} />
      <AgendaModal visible={agendaVisible} psychId={user?.id || ''} onClose={() => setAgendaVisible(false)} />
      <PsychConsultationsModal visible={consultVisible} psychId={user?.id || ''} onClose={() => setConsultVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 48, maxWidth: 520, width: '100%', alignSelf: 'center' },

  // Header
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, gap: 12 },
  hello: { fontSize: 27, fontFamily: 'PlayfairDisplay_700Bold', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, fontFamily: 'Outfit_500Medium', marginTop: 5 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 15, paddingHorizontal: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  statNum: { fontSize: 26, fontFamily: 'PlayfairDisplay_700Bold', lineHeight: 30 },
  statLbl: { fontSize: 11.5, fontFamily: 'Outfit_500Medium', color: GREY_INK, marginTop: 6 },

  // Atención
  attnCard: {
    backgroundColor: AMBER_BG, borderRadius: 22, paddingHorizontal: 16, paddingTop: 15, paddingBottom: 6, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  attnHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  attnHeadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: AMBER },
  attnHeadText: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: AMBER_INK, letterSpacing: 1.2 },
  attnRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(154,106,24,0.14)' },
  attnDot: { width: 9, height: 9, borderRadius: 5 },
  attnText: { flex: 1, fontSize: 13.5 },
  attnName: { fontFamily: 'Outfit_600SemiBold', color: '#5a4a2a' },
  attnMuted: { fontFamily: 'Outfit_500Medium', color: '#9a865f' },

  // Quick actions
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  act: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 13, alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  actIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actLabel: { fontSize: 11.5, fontFamily: 'Outfit_600SemiBold' },

  // Código pill
  codePill: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 18,
    paddingVertical: 14, paddingHorizontal: 18, marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  codeLbl: { fontSize: 10, fontFamily: 'Outfit_600SemiBold', color: GREY_INK, letterSpacing: 1 },
  codeVal: { fontSize: 22, fontFamily: 'PlayfairDisplay_700Bold', letterSpacing: 4, textTransform: 'uppercase', marginTop: 3 },
  copyBtn: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 16 },
  copyBtnText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },

  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontFamily: 'PlayfairDisplay_700Bold', letterSpacing: -0.2 },
  filterRow: { flexDirection: 'row', gap: 4 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  filterTabText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold' },

  // Empty
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 22, padding: 24, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  emptyText: { fontSize: 14, fontFamily: 'Outfit_400Regular', textAlign: 'center', lineHeight: 22 },

  // Patient card
  pcard: {
    flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#FFFFFF', borderRadius: 22,
    paddingVertical: 14, paddingHorizontal: 15, marginBottom: 11,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  pinfo: { flex: 1, minWidth: 0 },
  pnameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pname: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', letterSpacing: -0.1, flexShrink: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeText: { fontSize: 10, fontFamily: 'Outfit_600SemiBold', letterSpacing: 0.2 },
  pmeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  spark: { flexDirection: 'row', alignItems: 'flex-end', gap: 2.5, height: 22 },
  sparkBar: { width: 4, borderRadius: 2 },
  plast: { fontSize: 11.5, fontFamily: 'Outfit_500Medium', color: GREY_INK },
  pright: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  mood: { width: 11, height: 11, borderRadius: 6 },

  // Upsell
  upsellCard: {
    borderRadius: 24, padding: 24, marginTop: 12, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  upsellTitle: { fontSize: 20, fontFamily: 'PlayfairDisplay_700Bold', color: '#FFFFFF', marginBottom: 8 },
  upsellBody: { fontSize: 13.5, fontFamily: 'Outfit_400Regular', color: '#FFFFFF', opacity: 0.9, lineHeight: 20, marginBottom: 18 },
  upsellFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  upsellPrice: { fontSize: 19, fontFamily: 'Outfit_600SemiBold', color: '#FFFFFF' },
  upsellButton: {
    backgroundColor: '#FFFFFF', paddingHorizontal: 22, paddingVertical: 11, borderRadius: 100,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  upsellButtonText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },

  // Logout
  logoutLink: {
    alignSelf: 'center', marginTop: 24, marginBottom: 32, paddingVertical: 14, paddingHorizontal: 40,
    borderRadius: 9999, borderWidth: 1.5, borderColor: '#E5E1EE', backgroundColor: '#FFFFFF',
  },
  logoutText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
});
