import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../lib/theme-context';
import { useAuth } from '../../lib/auth-context';
import { getPsychPatients, getMoodEntries } from '../../lib/database';
import { moodScoreToEmoji, moodScoreToColor } from '../../constants/themes';
import BroadcastModal from '../../components/BroadcastModal';
import IncomeModal from '../../components/IncomeModal';

const AVATAR_COLORS = [
  '#6C5CE7', '#FF9F43', '#10AC84', '#FF78B0', '#00D2D3',
  '#E74C3C', '#F39C12', '#2D3436', '#27AE60', '#a29bfe',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getPatientStatus(data: any): { label: string; color: string; type: 'critical' | 'stable' | 'inactive' } {
  if (!data || !data.entries || data.entries.length === 0) {
    return { label: 'Sin registros', color: '#95A5A6', type: 'inactive' };
  }
  const lowDays = data.entries.filter((e: any) => e.score <= 3).length;
  if (lowDays >= 3 || (data.last && data.last.score <= 2)) {
    return { label: 'Mood Critico', color: '#E74C3C', type: 'critical' };
  }
  if (data.trend >= 0 && data.avg >= 5) {
    return { label: 'Estable', color: '#27AE60', type: 'stable' };
  }
  return { label: 'Sin cambios', color: '#95A5A6', type: 'inactive' };
}

function formatLastEntry(entry: any): string {
  if (!entry) return 'Sin registros';
  const d = new Date(entry.date + 'T12:00:00');
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  return `Hace ${diffDays} dias`;
}

async function copyToClipboard(text: string) {
  if (Platform.OS === 'web') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch { return false; }
  }
  try {
    const Clipboard = require('react-native').Clipboard;
    Clipboard.setString(text);
    return true;
  } catch { return false; }
}

export default function PsychDashboardScreen() {
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [patientData, setPatientData] = useState<{ [key: string]: any }>({});
  const [filter, setFilter] = useState<'todos' | 'urgentes'>('todos');
  const [copied, setCopied] = useState(false);
  const [broadcastVisible, setBroadcastVisible] = useState(false);
  const [incomeVisible, setIncomeVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const pts = await getPsychPatients(user.id);
    setPatients(pts);

    const data: { [key: string]: any } = {};
    for (const p of pts) {
      const entries = await getMoodEntries(p.patient_id, 7);
      const avg = entries.length > 0
        ? entries.reduce((s: number, e: any) => s + e.score, 0) / entries.length
        : 0;
      const last = entries.length > 0 ? entries[0] : null;
      const trend = entries.length >= 2
        ? entries[0].score - entries[entries.length - 1].score
        : 0;

      const alerts: { text: string; severity: 'critical' | 'warning' }[] = [];
      const lowDays = entries.filter((e: any) => e.score <= 3).length;

      // Alert: 3+ days with score <= 3 in the last 7 days
      if (lowDays >= 3) {
        alerts.push({ text: `${lowDays} dias con animo bajo esta semana`, severity: 'critical' });
      }

      // Alert: no entries in 3+ days (compare last entry date with today)
      if (last) {
        const lastDate = new Date(last.date + 'T12:00:00');
        const now = new Date();
        const diffMs = now.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays >= 3) {
          alerts.push({ text: `Sin registros hace ${diffDays} dias`, severity: 'warning' });
        }
      } else if (entries.length === 0) {
        alerts.push({ text: 'Sin registros recientes', severity: 'warning' });
      }

      // Alert: sudden drop (today's score is 3+ points lower than average)
      if (last && avg > 0) {
        const drop = avg - last.score;
        if (drop >= 3) {
          alerts.push({ text: `Caida abrupta: score de ${last.score} vs promedio de ${avg.toFixed(1)}`, severity: 'critical' });
        }
      }

      data[p.patient_id] = { entries, avg: Math.round(avg * 10) / 10, last, trend, alerts: alerts.map(a => a.text), alertDetails: alerts };
    }
    setPatientData(data);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLogout = async () => {
    await logout();
    if (Platform.OS === 'web') {
      window.location.assign('/');
    } else {
      router.replace('/');
    }
  };

  const handleCopy = async () => {
    if (user?.share_code) {
      const ok = await copyToClipboard(user.share_code);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const totalAlerts = Object.values(patientData).reduce(
    (s: number, d: any) => s + (d.alerts?.length || 0), 0
  );

  const filteredPatients = filter === 'urgentes'
    ? patients.filter((p) => {
        const data = patientData[p.patient_id];
        const status = getPatientStatus(data);
        return status.type === 'critical';
      })
    : patients;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={require('../../assets/nunis-logo.png')} style={{ width: 100, height: 36 }} resizeMode="contain" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Profesional</Text>
            </View>
          </View>
        </View>

        {/* Linking Code Card */}
        <View style={styles.card}>
          <Text style={[styles.labelMd, { color: colors.textSecondary }]}>
            Codigo de Vinculacion
          </Text>
          <Text style={[styles.codeValue, { color: colors.primary }]}>
            {user?.share_code || '------'}
          </Text>
          <TouchableOpacity onPress={handleCopy} style={styles.copyLink}>
            <Text style={[styles.copyLinkText, { color: colors.primary }]}>
              {copied ? 'Copiado!' : 'Copiar codigo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Acciones rápidas */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => setBroadcastVisible(true)}
            activeOpacity={0.85}
            disabled={patients.length === 0}
          >
            <Text style={styles.actionBtnText}>Enviar mensaje</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutline, { borderColor: colors.primary }]}
            onPress={() => setIncomeVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Ingresos</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.card]}>
            <Text style={[styles.labelMd, { color: colors.textSecondary }]}>Pacientes Activos</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{patients.length}</Text>
          </View>
          <View style={[styles.statCard, styles.card]}>
            <Text style={[styles.labelMd, { color: colors.textSecondary }]}>Alertas Criticas</Text>
            <Text style={[styles.statValue, { color: totalAlerts > 0 ? colors.danger : colors.text }]}>
              {totalAlerts}
            </Text>
          </View>
        </View>

        {/* Upsell Card */}
        <View style={[styles.upsellCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.upsellTitle}>Desbloquea Nunis Pro</Text>
          <Text style={styles.upsellBody}>
            Accede a analisis de sentimiento avanzados, reportes mensuales detallados y gestion ilimitada de pacientes.
          </Text>
          <View style={styles.upsellFooter}>
            <Text style={styles.upsellPrice}>$15/mes</Text>
            <TouchableOpacity style={styles.upsellButton} activeOpacity={0.8}>
              <Text style={[styles.upsellButtonText, { color: colors.primary }]}>Actualizar Ahora</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Patient Panel Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Panel de Pacientes</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterTab,
                filter === 'todos' && { backgroundColor: colors.bg },
              ]}
              onPress={() => setFilter('todos')}
            >
              <Text style={[
                styles.filterTabText,
                { color: filter === 'todos' ? colors.text : colors.textSecondary },
              ]}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterTab,
                filter === 'urgentes' && { backgroundColor: colors.danger + '18' },
              ]}
              onPress={() => setFilter('urgentes')}
            >
              <Text style={[
                styles.filterTabText,
                { color: filter === 'urgentes' ? colors.danger : colors.textSecondary },
              ]}>Urgentes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {filteredPatients.length === 0 ? (
          <View style={styles.card}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filter === 'urgentes'
                ? 'No hay pacientes con alertas urgentes.'
                : `Aun no tenes pacientes vinculados.\n\nComparti tu codigo ${user?.share_code || ''} con tus pacientes para que se vinculen desde su app.`}
            </Text>
          </View>
        ) : (
          filteredPatients.map((p) => {
            const data = patientData[p.patient_id] || {};
            const status = getPatientStatus(data);
            const initial = (p.name || '?')[0].toUpperCase();
            const avatarBg = getAvatarColor(p.name || '');

            return (
              <TouchableOpacity
                key={p.id}
                style={styles.patientCard}
                onPress={() => router.push(`/(psych)/patient/${p.patient_id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.patientRow}>
                  {/* Avatar + Name + Status */}
                  <View style={styles.patientInfo}>
                    <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
                      <Text style={styles.avatarLetter}>{initial}</Text>
                    </View>
                    <View style={styles.patientNameBlock}>
                      <Text style={[styles.patientName, { color: colors.text }]}>{p.name}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: status.color + '18' }]}>
                        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Chevron */}
                  <Text style={[styles.chevron, { color: colors.textSecondary }]}>{'>'}</Text>
                </View>

                {/* Mini sparkline bars */}
                {data.entries && data.entries.length > 0 && (
                  <View style={styles.sparklineRow}>
                    {data.entries.slice().reverse().map((e: any, i: number) => (
                      <View
                        key={i}
                        style={[styles.sparklineBar, {
                          height: Math.max(6, (e.score / 10) * 36),
                          backgroundColor: moodScoreToColor(e.score, colors),
                          opacity: 0.7,
                        }]}
                      />
                    ))}
                  </View>
                )}

                {/* Alerts */}
                {data.alertDetails && data.alertDetails.length > 0 && (
                  <View style={styles.alertsContainer}>
                    {data.alertDetails.map((alert: { text: string; severity: 'critical' | 'warning' }, idx: number) => (
                      <View
                        key={idx}
                        style={[
                          styles.alertItem,
                          {
                            borderLeftColor: alert.severity === 'critical' ? '#E74C3C' : '#FF9F43',
                            backgroundColor: alert.severity === 'critical' ? '#E74C3C10' : '#FF9F4310',
                          },
                        ]}
                      >
                        <Text style={[
                          styles.alertItemText,
                          { color: alert.severity === 'critical' ? '#E74C3C' : '#FF9F43' },
                        ]}>
                          {alert.severity === 'critical' ? '!' : '!'} {alert.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Last entry */}
                <View style={styles.patientFooter}>
                  <Text style={[styles.lastEntryLabel, { color: colors.textSecondary }]}>
                    Ultimo Registro
                  </Text>
                  <Text style={[styles.lastEntryValue, { color: colors.text }]}>
                    {formatLastEntry(data.last)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Logout link */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutLink}>
          <Text style={[styles.logoutText, { color: colors.textSecondary }]}>Cerrar sesion</Text>
        </TouchableOpacity>

      </ScrollView>

      <BroadcastModal
        visible={broadcastVisible}
        psychId={user?.id || ''}
        patients={patients.map((p: any) => ({ patient_id: p.patient_id, name: p.name }))}
        onClose={() => setBroadcastVisible(false)}
      />

      <IncomeModal
        visible={incomeVisible}
        psychId={user?.id || ''}
        patients={patients.map((p: any) => ({ patient_id: p.patient_id, name: p.name }))}
        onClose={() => setIncomeVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 24,
    paddingBottom: 48,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wordmark: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_700Bold',
    letterSpacing: -0.5,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#6C5CE7',
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // Card base
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  // Code Card
  labelMd: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.1,
    marginBottom: 8,
  },
  codeValue: {
    fontSize: 36,
    fontFamily: 'PlayfairDisplay_700Bold',
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  copyLink: {
    alignSelf: 'flex-start',
  },
  copyLinkText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 20,
    marginBottom: 0,
  },
  statValue: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay_700Bold',
    marginTop: 4,
  },

  // Upsell
  upsellCard: {
    borderRadius: 24,
    padding: 28,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  upsellTitle: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  upsellBody: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    lineHeight: 21,
    marginBottom: 20,
  },
  upsellFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  upsellPrice: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
  },
  upsellButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  upsellButtonText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterTabText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Empty
  emptyText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Patient Card
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  patientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
  },
  patientNameBlock: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  chevron: {
    fontSize: 20,
    fontFamily: 'Outfit_500Medium',
    marginLeft: 8,
  },

  // Sparkline
  sparklineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginTop: 14,
    height: 40,
    paddingHorizontal: 4,
  },
  sparklineBar: {
    flex: 1,
    borderRadius: 3,
    minHeight: 4,
  },

  // Footer
  patientFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f0edec',
  },
  lastEntryLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  lastEntryValue: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },

  // Alerts
  alertsContainer: {
    marginTop: 12,
    gap: 6,
  },
  alertItem: {
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  alertItemText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
  },
  actionBtnOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Logout
  logoutLink: {
    alignSelf: 'center',
    marginTop: 28,
    marginBottom: 32,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: '#E5E1EE',
    backgroundColor: '#FFFFFF',
  },
  logoutText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
});
