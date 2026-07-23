import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../lib/theme-context';
import { useAuth } from '../../../lib/auth-context';
import {
  getUserById, getAllMoodEntries, getCorrelationData, getJournalEntries, getPsychPatients,
  createTask, getPatientTasks,
  createSessionNote, getSessionNotes, deleteSessionNote,
} from '../../../lib/database';
import { moodScoreToColor } from '../../../constants/themes';
import { supabase } from '../../../lib/supabase';
import { generatePatientReport } from '../../../lib/report';
import Avatar from '../../../components/Avatar';

import { AMBER_BG, AMBER_INK, CORAL, TEAL, GREY_INK } from '../../../constants/palette';

function relativeDay(dateStr?: string) {
  if (!dateStr) return 'Sin registros';
  const d = new Date(dateStr + 'T12:00:00');
  const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return `Hace ${diff} días`;
}

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
  const [tab, setTab] = useState<'resumen' | 'historial' | 'correlaciones' | 'notas'>('resumen');
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiTopics, setAiTopics] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const handleReport = async () => {
    if (reportLoading || !patient) return;
    setReportLoading(true);
    try { await generatePatientReport(patient, entries, correlations, tasks); } catch {}
    setReportLoading(false);
  };

  const generateSummary = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const { data, error } = await supabase.functions.invoke('pre-session-summary', { body: { patientId: id } });
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
    setPermissions(pts.find((pt: any) => pt.patient_id === id));
    setEntries(await getAllMoodEntries(id));
    setCorrelations(await getCorrelationData(id));
    setJournalEntries(await getJournalEntries(id, 10));
    setTasks(await getPatientTasks(id));
    try { setNotes(await getSessionNotes(id)); } catch { setNotes([]); }
  }, [id, user]);

  const handleSaveNote = async () => {
    if (!newNote.trim() || !user || !id || savingNote) return;
    setSavingNote(true);
    try {
      const noteId = 'note_' + Math.random().toString(36).slice(2, 14);
      const today = new Date().toISOString().split('T')[0];
      await createSessionNote(noteId, user.id, id, newNote.trim(), today);
      setNewNote('');
      setNotes(await getSessionNotes(id));
    } catch {}
    setSavingNote(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    try { await deleteSessionNote(noteId); } catch {}
  };

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
  const avg7 = recentEntries.length > 0 ? (recentEntries.reduce((s, e) => s + e.score, 0) / recentEntries.length).toFixed(1) : '-';
  const avg30 = entries.slice(0, 30).length > 0 ? (entries.slice(0, 30).reduce((s, e) => s + e.score, 0) / Math.min(entries.length, 30)).toFixed(1) : '-';
  const lowDays7 = recentEntries.filter((e) => e.score <= 3).length;
  const lastEntry = entries.length > 0 ? entries[0] : null;
  const trend7 = recentEntries.length >= 2 ? recentEntries[0].score - recentEntries[recentEntries.length - 1].score : 0;
  const trendColor = trend7 > 0 ? TEAL : trend7 < 0 ? CORAL : GREY_INK;
  const trendIcon = trend7 > 0 ? 'trending-up' : trend7 < 0 ? 'trending-down' : 'remove';

  const formatDate = (dateStr: string) => new Date(dateStr + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  const formatDayShort = (dateStr: string) => new Date(dateStr + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short' }).slice(0, 3);

  const tabOptions = [
    { key: 'resumen' as const, label: 'Resumen' },
    { key: 'historial' as const, label: 'Historial' },
    { key: 'correlaciones' as const, label: 'Correlaciones' },
    { key: 'notas' as const, label: 'Notas' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Avatar url={patient.avatar_url} name={patient.name} size={52} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.pName, { color: colors.text }]} numberOfLines={1}>{patient.name}</Text>
            <View style={styles.pMetaRow}>
              {lastEntry && <View style={[styles.moodDot, { backgroundColor: moodScoreToColor(lastEntry.score, colors) }]} />}
              <Text style={[styles.pMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                Último registro: {relativeDay(lastEntry?.date)}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: colors.text }]}>{avg7}</Text>
            <Text style={styles.statLbl}>Prom. 7 días</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: colors.text }]}>{avg30}</Text>
            <Text style={styles.statLbl}>Prom. 30 días</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.trendNum}>
              <Ionicons name={trendIcon as any} size={18} color={trendColor} />
              <Text style={[styles.statNum, { color: trendColor }]}>{trend7 > 0 ? '+' : ''}{trend7}</Text>
            </View>
            <Text style={styles.statLbl}>Tendencia 7d</Text>
          </View>
        </View>

        {/* Atención */}
        {lowDays7 >= 3 && (
          <View style={styles.attnCard}>
            <View style={[styles.attnDot, { backgroundColor: CORAL }]} />
            <Text style={styles.attnText}>{lowDays7} días con ánimo bajo esta semana</Text>
          </View>
        )}

        {/* Resumen IA */}
        <View style={[styles.aiCard, { backgroundColor: colors.primary + '0D' }]}>
          <View style={styles.aiHead}>
            <View style={[styles.aiIcon, { backgroundColor: colors.primary + '1A' }]}>
              <Ionicons name="sparkles" size={17} color={colors.primary} />
            </View>
            <Text style={[styles.aiTitle, { color: colors.text }]}>Resumen pre-sesión</Text>
          </View>
          {aiSummary ? (
            <View>
              <Text style={[styles.aiText, { color: colors.text }]}>{aiSummary}</Text>
              {aiTopics.length > 0 && (
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.aiLabel, { color: colors.primary }]}>Temas sugeridos</Text>
                  {aiTopics.map((t, i) => (
                    <View key={i} style={styles.aiTopicRow}>
                      <View style={[styles.aiTopicDot, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.aiTopicText, { color: colors.textSecondary }]}>{t}</Text>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity onPress={generateSummary} disabled={aiLoading} style={{ marginTop: 14 }}>
                <Text style={[styles.aiRegen, { color: colors.primary }]}>{aiLoading ? 'Generando...' : 'Regenerar'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[styles.aiHint, { color: colors.textSecondary }]}>
                Generá un resumen con los datos de la semana y temas sugeridos para la sesión.
              </Text>
              <TouchableOpacity
                style={[styles.aiBtn, { backgroundColor: colors.primary }, aiLoading && { opacity: 0.7 }]}
                onPress={generateSummary} disabled={aiLoading} activeOpacity={0.85}
              >
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                <Text style={styles.aiBtnText}>{aiLoading ? 'Generando...' : 'Generar resumen con IA'}</Text>
              </TouchableOpacity>
            </>
          )}
          {aiError ? <Text style={[styles.aiError, { color: colors.danger }]}>{aiError}</Text> : null}
        </View>

        {/* Reporte PDF */}
        <TouchableOpacity style={[styles.reportBtn, { borderColor: colors.primary }]} onPress={handleReport} disabled={reportLoading} activeOpacity={0.85}>
          <Ionicons name="document-text-outline" size={17} color={colors.primary} />
          <Text style={[styles.reportBtnText, { color: colors.primary }]}>{reportLoading ? 'Generando...' : 'Reporte de progreso (PDF)'}</Text>
        </TouchableOpacity>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {tabOptions.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabPill, tab === t.key ? { backgroundColor: colors.primary } : { backgroundColor: '#FFFFFF' }]}
              onPress={() => setTab(t.key)} activeOpacity={0.7}
            >
              <Text numberOfLines={1} style={[styles.tabPillText, { color: tab === t.key ? '#FFFFFF' : colors.textSecondary }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* RESUMEN */}
        {tab === 'resumen' && (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Estado de ánimo</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Últimos 7 días</Text>
              </View>
              {recentEntries.length > 0 ? (
                <View style={styles.barChart}>
                  {recentEntries.slice().reverse().map((e, i) => {
                    const barColor = moodScoreToColor(e.score, colors);
                    return (
                      <View key={i} style={styles.barColumn}>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { height: Math.max(16, (e.score / 10) * 120), backgroundColor: barColor }]} />
                        </View>
                        <Text style={[styles.barScore, { color: barColor }]}>{e.score}</Text>
                        <Text style={[styles.barDay, { color: colors.textSecondary }]}>{formatDayShort(e.date)}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Sin datos</Text>}
            </View>

            <View style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Journal</Text>
              {permissions?.share_journal ? (
                journalEntries.length > 0 ? (
                  journalEntries.map((je) => (
                    <View key={je.id} style={styles.journalItem}>
                      <Text style={[styles.journalDate, { color: colors.textSecondary }]}>{je.date}</Text>
                      {je.prompt && <Text style={[styles.journalPrompt, { color: colors.primary }]}>{je.prompt}</Text>}
                      <View style={[styles.encryptedBadge, { backgroundColor: AMBER_BG }]}>
                        <Text style={[styles.encryptedText, { color: AMBER_INK }]}>Contenido encriptado — solo visible para el paciente</Text>
                      </View>
                    </View>
                  ))
                ) : <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Sin entradas de journal</Text>
              ) : (
                <View style={[styles.encryptedBadge, { backgroundColor: '#F1EFF4', marginTop: 8 }]}>
                  <Text style={[styles.encryptedText, { color: colors.textSecondary }]}>El paciente no compartió sus entradas de journal</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* HISTORIAL */}
        {tab === 'historial' && (
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Historial completo</Text>
            {entries.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Sin registros</Text>
            ) : (
              entries.slice(0, 30).map((e, index) => {
                const c = moodScoreToColor(e.score, colors);
                return (
                  <View key={e.id} style={[styles.historyRow, index < Math.min(entries.length, 30) - 1 && styles.historyRowBorder]}>
                    <View style={styles.historyLeft}>
                      <View style={[styles.moodDot, { backgroundColor: c }]} />
                      <Text style={[styles.historyDate, { color: colors.text }]}>{formatDate(e.date)}</Text>
                    </View>
                    <View style={[styles.historyScoreBadge, { backgroundColor: c + '1F' }]}>
                      <Text style={[styles.historyScore, { color: c }]}>{e.score}/10</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* CORRELACIONES */}
        {tab === 'correlaciones' && (
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Correlaciones</Text>
            {correlations.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aún no hay suficientes datos para correlaciones</Text>
            ) : (
              correlations.map((c, index) => {
                const diff = c.avg_mood_with - c.avg_mood_overall;
                const diffColor = diff >= 0 ? TEAL : CORAL;
                const barWidth = Math.min(100, Math.max(10, (c.avg_mood_with / 10) * 100));
                return (
                  <View key={c.id} style={[styles.corrRow, index < correlations.length - 1 && styles.corrRowBorder]}>
                    <View style={styles.corrTop}>
                      <Text style={[styles.corrLabel, { color: colors.text }]}>{c.emoji} {c.name}</Text>
                      <View style={styles.corrValues}>
                        <Text style={[styles.corrAvg, { color: moodScoreToColor(c.avg_mood_with, colors) }]}>{c.avg_mood_with.toFixed(1)}</Text>
                        <View style={[styles.corrDiffBadge, { backgroundColor: diffColor + '1F' }]}>
                          <Text style={[styles.corrDiff, { color: diffColor }]}>{diff >= 0 ? '+' : ''}{diff.toFixed(1)}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.corrBarTrack}>
                      <View style={[styles.corrBarFill, { width: `${barWidth}%`, backgroundColor: moodScoreToColor(c.avg_mood_with, colors) + '55' }]} />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* NOTAS */}
        {tab === 'notas' && (
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Notas de sesión</Text>
            <Text style={[styles.notesHint, { color: colors.textSecondary }]}>Privadas: solo vos las ves. Quedan pegadas al historial del paciente.</Text>
            <TextInput
              style={[styles.noteInput, { color: colors.text, borderColor: colors.textSecondary + '30' }]}
              placeholder="Escribí la nota de la sesión de hoy..."
              placeholderTextColor={colors.textSecondary}
              value={newNote} onChangeText={setNewNote} multiline numberOfLines={4} textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.noteSaveBtn, { backgroundColor: colors.primary, opacity: (newNote.trim() && !savingNote) ? 1 : 0.5 }]}
              onPress={handleSaveNote} disabled={!newNote.trim() || savingNote} activeOpacity={0.85}
            >
              <Text style={styles.noteSaveBtnText}>{savingNote ? 'Guardando...' : 'Guardar nota'}</Text>
            </TouchableOpacity>
            {notes.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary, marginTop: 16 }]}>Todavía no hay notas para este paciente.</Text>
            ) : (
              notes.map((n) => (
                <View key={n.id} style={styles.noteItem}>
                  <View style={styles.noteItemHeader}>
                    <Text style={[styles.noteDate, { color: colors.primary }]}>
                      {new Date(n.session_date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                    <TouchableOpacity onPress={() => handleDeleteNote(n.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.noteBody, { color: colors.text }]}>{n.body}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Asignar tarea */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Asignar tarea</Text>
          <View style={styles.taskInputRow}>
            <TextInput
              style={[styles.taskInput, { color: colors.text, borderColor: colors.textSecondary + '40' }]}
              placeholder="Descripción de la tarea..."
              placeholderTextColor={colors.textSecondary}
              value={newTaskDesc} onChangeText={setNewTaskDesc}
            />
            <TouchableOpacity
              style={[styles.taskAssignBtn, { backgroundColor: colors.primary, opacity: newTaskDesc.trim() ? 1 : 0.5 }]}
              onPress={async () => {
                if (!newTaskDesc.trim() || !user || !id) return;
                const taskId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
                await createTask(taskId, user.id, id, newTaskDesc.trim(), null);
                setNewTaskDesc('');
                setTasks(await getPatientTasks(id));
              }}
              disabled={!newTaskDesc.trim()} activeOpacity={0.7}
            >
              <Text style={styles.taskAssignBtnText}>Asignar</Text>
            </TouchableOpacity>
          </View>
          {tasks.length > 0 && (
            <View style={styles.taskList}>
              {tasks.map((task) => {
                const done = task.status === 'completed';
                return (
                  <View key={task.id} style={[styles.taskItem, { borderLeftColor: done ? TEAL : colors.primary }]}>
                    <View style={styles.taskItemContent}>
                      <Text style={[styles.taskItemText, { color: colors.text }, done && styles.taskItemCompleted]}>{task.description}</Text>
                      <View style={[styles.taskStatusBadge, { backgroundColor: done ? TEAL + '1F' : AMBER_BG }]}>
                        <Text style={[styles.taskStatusText, { color: done ? TEAL : AMBER_INK }]}>{done ? 'Completada' : 'Pendiente'}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 48, maxWidth: 520, width: '100%', alignSelf: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, fontFamily: 'Outfit_400Regular' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  pName: { fontSize: 22, fontFamily: 'PlayfairDisplay_700Bold', letterSpacing: -0.3 },
  pMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 },
  moodDot: { width: 9, height: 9, borderRadius: 5 },
  pMeta: { fontSize: 12.5, fontFamily: 'Outfit_500Medium', flexShrink: 1 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 15, paddingHorizontal: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  statNum: { fontSize: 24, fontFamily: 'PlayfairDisplay_700Bold', lineHeight: 28 },
  trendNum: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statLbl: { fontSize: 11, fontFamily: 'Outfit_500Medium', color: GREY_INK, marginTop: 6 },

  // Atención
  attnCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: AMBER_BG, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 16 },
  attnDot: { width: 9, height: 9, borderRadius: 5 },
  attnText: { flex: 1, fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: AMBER_INK },

  // AI card
  aiCard: { borderRadius: 22, padding: 20, marginBottom: 14 },
  aiHead: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 14 },
  aiIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  aiTitle: { fontSize: 18, fontFamily: 'PlayfairDisplay_700Bold' },
  aiHint: { fontSize: 13.5, fontFamily: 'Outfit_400Regular', lineHeight: 20, marginBottom: 14 },
  aiText: { fontSize: 14, fontFamily: 'Outfit_400Regular', lineHeight: 21 },
  aiLabel: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  aiTopicRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 7 },
  aiTopicDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  aiTopicText: { fontSize: 14, fontFamily: 'Outfit_400Regular', flex: 1, lineHeight: 20 },
  aiRegen: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  aiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 13 },
  aiBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  aiError: { fontSize: 12, fontFamily: 'Outfit_500Medium', marginTop: 10 },

  // Report
  reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: 14, paddingVertical: 13, marginBottom: 20, backgroundColor: '#FFFFFF' },
  reportBtnText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },

  // Tabs
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  tabPill: { flex: 1, paddingVertical: 10, borderRadius: 100, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  tabPillText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold' },

  // Card
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 22, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 },
  cardTitle: { fontSize: 18, fontFamily: 'PlayfairDisplay_700Bold', marginBottom: 14 },
  cardSubtitle: { fontSize: 12, fontFamily: 'Outfit_500Medium' },

  // Bar chart
  barChart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 160, paddingHorizontal: 4 },
  barColumn: { alignItems: 'center', flex: 1, gap: 6 },
  barTrack: { width: 26, height: 120, borderRadius: 13, backgroundColor: '#F3F0EE', justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 13 },
  barScore: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  barDay: { fontSize: 11, fontFamily: 'Outfit_500Medium', textTransform: 'capitalize' },

  // Journal
  journalItem: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0edec' },
  journalDate: { fontSize: 12, fontFamily: 'Outfit_500Medium', marginBottom: 4 },
  journalPrompt: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', marginBottom: 8 },
  encryptedBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  encryptedText: { fontSize: 12, fontFamily: 'Outfit_500Medium' },

  emptyText: { fontSize: 14, fontFamily: 'Outfit_400Regular', textAlign: 'center', paddingVertical: 20 },

  // Notas
  notesHint: { fontSize: 13, fontFamily: 'Outfit_400Regular', marginBottom: 12, lineHeight: 18 },
  noteInput: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15, fontFamily: 'Outfit_400Regular', minHeight: 100, backgroundColor: '#FAFAFC' },
  noteSaveBtn: { borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 12 },
  noteSaveBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  noteItem: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F2F0F7' },
  noteItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  noteDate: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', textTransform: 'capitalize' },
  noteBody: { fontSize: 15, fontFamily: 'Outfit_400Regular', lineHeight: 22 },

  // History
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13 },
  historyRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0edec' },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyDate: { fontSize: 14, fontFamily: 'Outfit_500Medium', textTransform: 'capitalize' },
  historyScoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  historyScore: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },

  // Correlations
  corrRow: { paddingVertical: 14 },
  corrRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0edec' },
  corrTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  corrLabel: { fontSize: 15, fontFamily: 'Outfit_500Medium', flex: 1 },
  corrValues: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  corrAvg: { fontSize: 17, fontFamily: 'Outfit_600SemiBold' },
  corrDiffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  corrDiff: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  corrBarTrack: { height: 6, borderRadius: 3, backgroundColor: '#f0edec', overflow: 'hidden' },
  corrBarFill: { height: '100%', borderRadius: 3 },

  // Tasks
  taskInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  taskInput: { flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, fontFamily: 'Outfit_400Regular' },
  taskAssignBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  taskAssignBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  taskList: { marginTop: 20, gap: 8 },
  taskItem: { borderLeftWidth: 3, backgroundColor: '#F8F7FF', borderRadius: 12, padding: 14 },
  taskItemContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  taskItemText: { fontSize: 14, fontFamily: 'Outfit_500Medium', flex: 1 },
  taskItemCompleted: { textDecorationLine: 'line-through', opacity: 0.6 },
  taskStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  taskStatusText: { fontSize: 11, fontFamily: 'Outfit_600SemiBold' },
});
