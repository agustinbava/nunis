import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../lib/theme-context';
import { useAuth } from '../../../lib/auth-context';
import {
  getUserById, getAllMoodEntries, getEntryActivities,
  getCorrelationData, getJournalEntries, getPsychPatients,
  createTask, getPatientTasks,
} from '../../../lib/database';
import { moodScoreToEmoji, moodScoreToColor } from '../../../constants/themes';
import { supabase } from '../../../lib/supabase';

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [correlations, setCorrelations] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any>(null);
  const [tab, setTab] = useState<'resumen' | 'historial' | 'correlaciones'>('resumen');
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiTopics, setAiTopics] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const generateSummary = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const { data, error } = await supabase.functions.invoke('pre-session-summary', {
        body: { patientId: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiSummary(data.resumen);
      setAiTopics(data.temas ?? []);
    } catch (e: any) {
      setAiError('No se pudo generar el resumen con IA. Verificá que la Edge Function esté desplegada. ' + (e?.message ?? ''));
    } finally {
      setAiLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    if (!id || !user) return;
    const p = await getUserById(id);
    setPatient(p);

    const pts = await getPsychPatients(user.id);
    const link = pts.find((pt: any) => pt.patient_id === id);
    setPermissions(link);

    const moodData = await getAllMoodEntries(id);
    setEntries(moodData);

    const corrData = await getCorrelationData(id);
    setCorrelations(corrData);

    const jEntries = await getJournalEntries(id, 10);
    setJournalEntries(jEntries);

    const patientTasks = await getPatientTasks(id);
    setTasks(patientTasks);
  }, [id, user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!patient) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const recentEntries = entries.slice(0, 7);
  const avg7 = recentEntries.length > 0
    ? (recentEntries.reduce((s, e) => s + e.score, 0) / recentEntries.length).toFixed(1)
    : '-';
  const avg30 = entries.slice(0, 30).length > 0
    ? (entries.slice(0, 30).reduce((s, e) => s + e.score, 0) / Math.min(entries.length, 30)).toFixed(1)
    : '-';

  const lowDays7 = recentEntries.filter((e) => e.score <= 3).length;
  const lastEntry = entries.length > 0 ? entries[0] : null;
  const trend7 = recentEntries.length >= 2
    ? recentEntries[0].score - recentEntries[recentEntries.length - 1].score
    : 0;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatDayShort = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-AR', { weekday: 'short' }).slice(0, 3);
  };

  const tabOptions = [
    { key: 'resumen' as const, label: 'Resumen' },
    { key: 'historial' as const, label: 'Historial' },
    { key: 'correlaciones' as const, label: 'Correlaciones' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
              <Text style={[styles.backArrow, { color: colors.primary }]}>{'<'}</Text>
            </TouchableOpacity>
            <Image source={require('../../../assets/nunis-logo.png')} style={{ width: 100, height: 36 }} resizeMode="contain" />
          </View>
        </View>

        {/* Patient Name */}
        <Text style={[styles.patientName, { color: colors.text }]}>{patient.name}</Text>

        {/* Pre-Session Summary Card */}
        <View style={[styles.preSummaryCard, { backgroundColor: colors.primary + '0D' }]}>
          <View style={styles.preSummaryHeader}>
            <View style={[styles.preSummaryIcon, { backgroundColor: colors.primary + '18' }]}>
              <Text style={[styles.preSummaryIconText, { color: colors.primary }]}>{'~'}</Text>
            </View>
            <Text style={[styles.preSummaryTitle, { color: colors.text }]}>Resumen Pre-Sesion</Text>
          </View>

          <View style={styles.bulletList}>
            <View style={styles.bulletRow}>
              <View style={[styles.bulletLine, { backgroundColor: colors.primary }]} />
              <View style={styles.bulletContent}>
                <Text style={[styles.bulletLabel, { color: colors.primary }]}>Promedio 7 dias</Text>
                <Text style={[styles.bulletValue, { color: colors.textSecondary }]}>
                  Puntaje promedio: <Text style={{ fontFamily: 'Outfit_600SemiBold', color: colors.text }}>{avg7}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.bulletRow}>
              <View style={[styles.bulletLine, { backgroundColor: '#FF9F43' }]} />
              <View style={styles.bulletContent}>
                <Text style={[styles.bulletLabel, { color: '#FF9F43' }]}>Tendencia</Text>
                <Text style={[styles.bulletValue, { color: colors.textSecondary }]}>
                  {trend7 > 0 ? 'Tendencia ascendente' : trend7 < 0 ? 'Tendencia descendente' : 'Estable'}{' '}
                  <Text style={{
                    fontFamily: 'Outfit_600SemiBold',
                    color: trend7 > 0 ? colors.success : trend7 < 0 ? colors.danger : colors.textSecondary,
                  }}>
                    ({trend7 > 0 ? '+' : ''}{trend7})
                  </Text>
                </Text>
              </View>
            </View>

            <View style={styles.bulletRow}>
              <View style={[styles.bulletLine, { backgroundColor: lowDays7 >= 3 ? colors.danger : colors.success }]} />
              <View style={styles.bulletContent}>
                <Text style={[styles.bulletLabel, { color: lowDays7 >= 3 ? colors.danger : colors.success }]}>
                  Alertas
                </Text>
                <Text style={[styles.bulletValue, { color: colors.textSecondary }]}>
                  Dias con animo bajo (3 o menos):{' '}
                  <Text style={{
                    fontFamily: 'Outfit_600SemiBold',
                    color: lowDays7 >= 3 ? colors.danger : colors.text,
                  }}>{lowDays7}</Text>
                  {' '}de 7
                </Text>
              </View>
            </View>

            {lastEntry && (
              <View style={styles.bulletRow}>
                <View style={[styles.bulletLine, { backgroundColor: colors.textSecondary }]} />
                <View style={styles.bulletContent}>
                  <Text style={[styles.bulletLabel, { color: colors.textSecondary }]}>Ultimo registro</Text>
                  <Text style={[styles.bulletValue, { color: colors.textSecondary }]}>
                    {formatDate(lastEntry.date)} {moodScoreToEmoji(lastEntry.score)} {lastEntry.score}/10
                  </Text>
                </View>
              </View>
            )}
          </View>

          {lowDays7 >= 3 && (
            <View style={[styles.alertBanner, { backgroundColor: colors.danger + '15' }]}>
              <Text style={[styles.alertBannerText, { color: colors.danger }]}>
                Atencion: {lowDays7} dias con animo bajo esta semana
              </Text>
            </View>
          )}

          {/* Resumen generado con IA */}
          <View style={styles.aiSection}>
            {aiSummary ? (
              <View>
                <Text style={[styles.aiLabel, { color: colors.primary }]}>Resumen IA</Text>
                <Text style={[styles.aiText, { color: colors.text }]}>{aiSummary}</Text>
                {aiTopics.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.aiLabel, { color: colors.primary }]}>Temas sugeridos</Text>
                    {aiTopics.map((t, i) => (
                      <View key={i} style={styles.aiTopicRow}>
                        <View style={[styles.aiTopicDot, { backgroundColor: colors.primary }]} />
                        <Text style={[styles.aiTopicText, { color: colors.textSecondary }]}>{t}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <TouchableOpacity onPress={generateSummary} disabled={aiLoading} style={{ marginTop: 12 }}>
                  <Text style={[styles.aiRegen, { color: colors.primary }]}>
                    {aiLoading ? 'Generando...' : 'Regenerar'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.aiBtn, { backgroundColor: colors.primary }, aiLoading && { opacity: 0.7 }]}
                onPress={generateSummary}
                disabled={aiLoading}
                activeOpacity={0.85}
              >
                <Text style={styles.aiBtnText}>
                  {aiLoading ? 'Generando resumen...' : 'Generar resumen con IA'}
                </Text>
              </TouchableOpacity>
            )}
            {aiError ? <Text style={[styles.aiError, { color: colors.danger }]}>{aiError}</Text> : null}
          </View>
        </View>

        {/* Tab Row */}
        <View style={styles.tabRow}>
          {tabOptions.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tabPill,
                tab === t.key
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: 'transparent' },
              ]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabPillText,
                { color: tab === t.key ? '#FFFFFF' : colors.textSecondary },
              ]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* RESUMEN TAB */}
        {tab === 'resumen' && (
          <>
            {/* 7-Day Mood Bar Chart */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Estado de animo</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Ultimos 7 dias</Text>
              </View>
              {recentEntries.length > 0 ? (
                <View style={styles.barChart}>
                  {recentEntries.slice().reverse().map((e, i) => {
                    const barColor = moodScoreToColor(e.score, colors);
                    const barHeight = Math.max(16, (e.score / 10) * 120);
                    return (
                      <View key={i} style={styles.barColumn}>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, {
                            height: barHeight,
                            backgroundColor: barColor,
                          }]} />
                        </View>
                        <Text style={[styles.barScore, { color: barColor }]}>{e.score}</Text>
                        <Text style={[styles.barDay, { color: colors.textSecondary }]}>
                          {formatDayShort(e.date)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Sin datos</Text>
              )}
            </View>

            {/* Journal Entries */}
            <View style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Journal</Text>
              {permissions?.share_journal ? (
                journalEntries.length > 0 ? (
                  journalEntries.map((je) => (
                    <View key={je.id} style={styles.journalItem}>
                      <Text style={[styles.journalDate, { color: colors.textSecondary }]}>{je.date}</Text>
                      {je.prompt && (
                        <Text style={[styles.journalPrompt, { color: colors.primary }]}>{je.prompt}</Text>
                      )}
                      <View style={[styles.encryptedBadge, { backgroundColor: colors.warning + '18' }]}>
                        <Text style={[styles.encryptedText, { color: colors.warning }]}>
                          Contenido encriptado -- solo visible para el paciente
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Sin entradas de journal
                  </Text>
                )
              ) : (
                <View style={[styles.encryptedBadge, { backgroundColor: colors.textSecondary + '10', marginTop: 8 }]}>
                  <Text style={[styles.encryptedText, { color: colors.textSecondary }]}>
                    El paciente no compartio sus entradas de journal
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* HISTORIAL TAB */}
        {tab === 'historial' && (
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Historial completo</Text>
            {entries.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Sin registros</Text>
            ) : (
              entries.slice(0, 30).map((e, index) => (
                <View
                  key={e.id}
                  style={[
                    styles.historyRow,
                    index < Math.min(entries.length, 30) - 1 && styles.historyRowBorder,
                  ]}
                >
                  <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                    {formatDate(e.date)}
                  </Text>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyEmoji}>{moodScoreToEmoji(e.score)}</Text>
                    <View style={[styles.historyScoreBadge, {
                      backgroundColor: moodScoreToColor(e.score, colors) + '18',
                    }]}>
                      <Text style={[styles.historyScore, {
                        color: moodScoreToColor(e.score, colors),
                      }]}>
                        {e.score}/10
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* CORRELACIONES TAB */}
        {tab === 'correlaciones' && (
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Correlaciones</Text>
            {correlations.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Aun no hay suficientes datos para correlaciones
              </Text>
            ) : (
              correlations.map((c, index) => {
                const diff = c.avg_mood_with - c.avg_mood_overall;
                const diffColor = diff >= 0 ? colors.success : colors.danger;
                const barWidth = Math.min(100, Math.max(10, (c.avg_mood_with / 10) * 100));

                return (
                  <View
                    key={c.id}
                    style={[
                      styles.corrRow,
                      index < correlations.length - 1 && styles.corrRowBorder,
                    ]}
                  >
                    <View style={styles.corrTop}>
                      <Text style={[styles.corrLabel, { color: colors.text }]}>
                        {c.emoji} {c.name}
                      </Text>
                      <View style={styles.corrValues}>
                        <Text style={[styles.corrAvg, {
                          color: moodScoreToColor(c.avg_mood_with, colors),
                        }]}>
                          {c.avg_mood_with.toFixed(1)}
                        </Text>
                        <View style={[styles.corrDiffBadge, { backgroundColor: diffColor + '18' }]}>
                          <Text style={[styles.corrDiff, { color: diffColor }]}>
                            {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {/* Colored bar */}
                    <View style={styles.corrBarTrack}>
                      <View style={[styles.corrBarFill, {
                        width: `${barWidth}%`,
                        backgroundColor: moodScoreToColor(c.avg_mood_with, colors) + '40',
                      }]} />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Asignar Tarea Section */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Asignar tarea</Text>
          <View style={styles.taskInputRow}>
            <TextInput
              style={[styles.taskInput, { color: colors.text, borderColor: colors.textSecondary + '40' }]}
              placeholder="Descripcion de la tarea..."
              placeholderTextColor={colors.textSecondary}
              value={newTaskDesc}
              onChangeText={setNewTaskDesc}
            />
            <TouchableOpacity
              style={[styles.taskAssignBtn, { backgroundColor: colors.primary, opacity: newTaskDesc.trim() ? 1 : 0.5 }]}
              onPress={async () => {
                if (!newTaskDesc.trim() || !user || !id) return;
                const taskId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
                await createTask(taskId, user.id, id, newTaskDesc.trim(), null);
                setNewTaskDesc('');
                const updatedTasks = await getPatientTasks(id);
                setTasks(updatedTasks);
              }}
              disabled={!newTaskDesc.trim()}
              activeOpacity={0.7}
            >
              <Text style={styles.taskAssignBtnText}>Asignar</Text>
            </TouchableOpacity>
          </View>

          {/* Task List */}
          {tasks.length > 0 && (
            <View style={styles.taskList}>
              {tasks.map((task) => (
                <View key={task.id} style={[styles.taskItem, { borderLeftColor: task.status === 'completed' ? '#27AE60' : colors.primary }]}>
                  <View style={styles.taskItemContent}>
                    <Text style={[
                      styles.taskItemText,
                      { color: colors.text },
                      task.status === 'completed' && styles.taskItemCompleted,
                    ]}>
                      {task.description}
                    </Text>
                    <View style={[styles.taskStatusBadge, {
                      backgroundColor: task.status === 'completed' ? '#27AE6018' : '#FF9F4318',
                    }]}>
                      <Text style={[styles.taskStatusText, {
                        color: task.status === 'completed' ? '#27AE60' : '#FF9F43',
                      }]}>
                        {task.status === 'completed' ? 'Completada' : 'Pendiente'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backArrow: {
    fontSize: 24,
    fontFamily: 'Outfit_500Medium',
  },
  wordmark: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_700Bold',
    letterSpacing: -0.5,
  },

  // Patient Name
  patientName: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay_700Bold',
    marginBottom: 20,
    lineHeight: 40,
  },

  // Pre-Session Summary
  preSummaryCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  preSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  preSummaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preSummaryIconText: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
  },
  preSummaryTitle: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  bulletList: {
    gap: 16,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 16,
  },
  bulletLine: {
    width: 3,
    borderRadius: 2,
  },
  bulletContent: {
    flex: 1,
  },
  bulletLabel: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 3,
  },
  bulletValue: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 20,
  },
  alertBanner: {
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  alertBannerText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    textAlign: 'center',
  },

  aiSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  aiLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aiText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 21,
  },
  aiTopicRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
  },
  aiTopicDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  aiTopicText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    flex: 1,
    lineHeight: 20,
  },
  aiRegen: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  aiBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  aiBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  aiError: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    marginTop: 10,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    paddingVertical: 4,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 100,
    alignItems: 'center',
  },
  tabPillText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Card
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay_700Bold',
    marginBottom: 16,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },

  // Bar Chart
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 160,
    paddingHorizontal: 4,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  barTrack: {
    width: 28,
    height: 120,
    borderRadius: 14,
    backgroundColor: '#f0edec',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 14,
  },
  barScore: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  barDay: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    textTransform: 'capitalize',
  },

  // Journal
  journalItem: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0edec',
  },
  journalDate: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    marginBottom: 4,
  },
  journalPrompt: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 8,
  },
  encryptedBadge: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  encryptedText: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },

  // Empty
  emptyText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    paddingVertical: 20,
  },

  // History
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  historyRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0edec',
  },
  historyDate: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyEmoji: {
    fontSize: 22,
  },
  historyScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  historyScore: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Correlations
  corrRow: {
    paddingVertical: 14,
  },
  corrRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0edec',
  },
  corrTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  corrLabel: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
    flex: 1,
  },
  corrValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  corrAvg: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  corrDiffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  corrDiff: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  corrBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f0edec',
    overflow: 'hidden',
  },
  corrBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Tasks
  taskInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  taskInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  taskAssignBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  taskAssignBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  taskList: {
    marginTop: 20,
    gap: 8,
  },
  taskItem: {
    borderLeftWidth: 3,
    backgroundColor: '#F8F7FF',
    borderRadius: 12,
    padding: 14,
  },
  taskItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  taskItemText: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    flex: 1,
  },
  taskItemCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  taskStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  taskStatusText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
});
