import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppContainer from '../../components/AppContainer';
import MoodRegistrationModal from '../../components/MoodRegistrationModal';
import ProfessionalModal from '../../components/ProfessionalModal';
import NotificationPopup from '../../components/NotificationPopup';
import NotificationsModal from '../../components/NotificationsModal';
import { useTheme } from '../../lib/theme-context';
import { useAuth } from '../../lib/auth-context';
import {
  getMoodEntries, getAllMoodEntries, getCorrelationData, getPatientTasks, completeTask,
  getProfessionals, getPatientMessages, markMessageRead, getPatientPsych,
} from '../../lib/database';
import { moodScoreToColor, moodScoreToEmoji } from '../../constants/themes';
import { getEmotionLabel } from '../../constants/emotions';

function todayStr() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function formatMsgDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const labels = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  return labels[day];
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

const WELLNESS_TIPS = [
  'Meditar 10 minutos mejora tu concentracion',
  'Caminar al aire libre reduce el estres',
  'Escribir un diario mejora tu autoconocimiento',
];

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [todayEmotions, setTodayEmotions] = useState<string[]>([]);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [correlations, setCorrelations] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [hasPsych, setHasPsych] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedProf, setSelectedProf] = useState<any>(null);
  const [profModalVisible, setProfModalVisible] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifMessages, setNotifMessages] = useState<any[]>([]);
  const [notifCenterVisible, setNotifCenterVisible] = useState(false);
  const notifShownRef = useRef(false);
  const [loaded, setLoaded] = useState(false);

  const unreadCount = messages.filter((m) => !m.read_at).length;

  const openNotifCenter = async () => {
    setNotifCenterVisible(true);
    const unreadIds = messages.filter((m) => !m.read_at).map((m) => m.id);
    if (unreadIds.length) {
      setMessages((prev) => prev.map((m) => unreadIds.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m));
      for (const id of unreadIds) { try { await markMessageRead(id); } catch {} }
    }
  };

  const openProfessional = (p: any) => {
    setSelectedProf(p);
    setProfModalVisible(true);
  };

  const dismissNotifPopup = async () => {
    setNotifVisible(false);
    const ids = notifMessages.map((m) => m.id);
    setMessages((prev) => prev.map((m) => ids.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m));
    for (const id of ids) {
      try { await markMessageRead(id); } catch {}
    }
  };

  const openMessage = async (m: any) => {
    if (!m.read_at) {
      setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, read_at: new Date().toISOString() } : x));
      try { await markMessageRead(m.id); } catch {}
    }
  };

  const loadData = useCallback(async () => {
    if (!user) return;

    // Get today's entry
    const entries = await getMoodEntries(user.id, 7);
    const today = entries.find((e: any) => e.date === todayStr());
    setTodayEntry(today || null);

    if (today && today.emotions) {
      try {
        const parsed = typeof today.emotions === 'string' ? JSON.parse(today.emotions) : today.emotions;
        setTodayEmotions(Array.isArray(parsed) ? parsed : []);
      } catch {
        setTodayEmotions([]);
      }
    } else {
      setTodayEmotions([]);
    }

    // Get all entries for the mini history
    const allEntries = await getAllMoodEntries(user.id);
    setRecentEntries(allEntries);

    // Get correlation data
    const corr = await getCorrelationData(user.id);
    setCorrelations(corr);

    // Get patient tasks
    const patTasks = await getPatientTasks(user.id);
    setTasks(patTasks);

    // Mensajes del profesional
    let willShowPopup = false;
    try {
      const msgs = await getPatientMessages(user.id);
      setMessages(msgs);
      // Popup flotante al entrar si hay mensajes sin leer (una vez por sesión)
      const unread = msgs.filter((m: any) => !m.read_at);
      if (unread.length > 0 && !notifShownRef.current) {
        notifShownRef.current = true;
        willShowPopup = true;
        setNotifMessages(unread);
        setNotifVisible(true);
      }
    } catch { setMessages([]); }

    // Directorio de profesionales + si ya tiene psicólogo
    try {
      const profs = await getProfessionals();
      setProfessionals(profs);
    } catch { setProfessionals([]); }
    try {
      const myPsych = await getPatientPsych(user.id);
      setHasPsych(!!myPsych);
    } catch { setHasPsych(false); }

    setLoaded(true);

    // If no entry today, auto-open modal (salvo que aparezca el popup de mensajes)
    if (!today && !willShowPopup) {
      setModalVisible(true);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleModalSaved = () => {
    loadData();
  };

  const handleModalClose = () => {
    setModalVisible(false);
  };

  // Build mini history data for last 7 days
  const last7 = getLast7Days();
  const entryMap: Record<string, any> = {};
  for (const e of recentEntries) {
    entryMap[e.date] = e;
  }

  // Find the top correlation insight
  const topCorrelation = correlations.length > 0 ? correlations[0] : null;
  const insightDiff = topCorrelation
    ? (topCorrelation.avg_mood_with - topCorrelation.avg_mood_overall).toFixed(1)
    : null;

  return (
    <AppContainer>
      {/* Header */}
      <View style={styles.headerRow}>
        <Image
          source={require('../../assets/nunis-logo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <TouchableOpacity style={styles.bellBtn} onPress={openNotifCenter} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          {unreadCount > 0 && (
            <View style={[styles.bellBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <Text style={[styles.greeting, { color: colors.text }]}>
        Hola, {user?.name?.split(' ')[0]}
      </Text>
      <Text style={[styles.date, { color: colors.textSecondary }]}>
        {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </Text>

      {/* Today's summary card */}
      {todayEntry && loaded ? (
        <View style={[styles.todayCard, cardShadow]}>
          <View style={styles.todayCardHeader}>
            <View style={[styles.todayCheckCircle, { backgroundColor: '#E8F5E9' }]}>
              <Text style={styles.todayCheckText}>{'\u2713'}</Text>
            </View>
            <Text style={[styles.todayRegistered, { color: colors.text }]}>Ya registraste hoy</Text>
          </View>
          <View style={styles.todayScoreRow}>
            <Text style={styles.todayEmoji}>{moodScoreToEmoji(todayEntry.score)}</Text>
            <Text style={[styles.todayScore, { color: colors.text }]}>{todayEntry.score}/10</Text>
          </View>
          {todayEmotions.length > 0 && (
            <View style={styles.todayEmotionsRow}>
              {todayEmotions.map((em: string, i: number) => (
                <View key={i} style={[styles.emotionTag, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.emotionTagText, { color: colors.primary }]}>{getEmotionLabel(em)}</Text>
                </View>
              ))}
            </View>
          )}
          <TouchableOpacity
            style={[styles.editBtn, { borderColor: colors.primary }]}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.editBtnText, { color: colors.primary }]}>Editar registro</Text>
          </TouchableOpacity>
        </View>
      ) : loaded ? (
        <TouchableOpacity
          style={[styles.registerPromptCard, cardShadow, { borderColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.registerPromptText, { color: colors.text }]}>
            Todavia no registraste tu dia
          </Text>
          <Text style={[styles.registerPromptSub, { color: colors.textSecondary }]}>
            Toca para registrar como te sentis
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Tareas de tu profesional */}
      {loaded && tasks.filter((t) => t.status === 'pending').length > 0 && (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tareas de tu profesional</Text>
          </View>
          {tasks.filter((t) => t.status === 'pending').map((task) => (
            <View key={task.id} style={[styles.taskCard, cardShadow]}>
              <Text style={[styles.taskDescription, { color: colors.text }]}>{task.description}</Text>
              <TouchableOpacity
                style={[styles.taskCompleteBtn, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  await completeTask(task.id);
                  setTasks((prev) =>
                    prev.map((t) => t.id === task.id ? { ...t, status: 'completed' } : t)
                  );
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.taskCompleteBtnText}>Completar</Text>
              </TouchableOpacity>
            </View>
          ))}
          {tasks.filter((t) => t.status === 'completed').length > 0 && (
            <View style={styles.completedTasksSection}>
              {tasks.filter((t) => t.status === 'completed').map((task) => (
                <View key={task.id} style={[styles.taskCardCompleted, cardShadow]}>
                  <Text style={[styles.taskCheckmark, { color: '#27AE60' }]}>{'\u2713'}</Text>
                  <Text style={[styles.taskDescriptionCompleted, { color: colors.textSecondary }]}>
                    {task.description}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Mini history (last 7 days) */}
      {loaded && recentEntries.length > 0 && (
        <View style={[styles.historyCard, cardShadow]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ultima semana</Text>
          <View style={styles.miniHistoryRow}>
            {last7.map((dateStr) => {
              const entry = entryMap[dateStr];
              const bgColor = entry ? moodScoreToColor(entry.score) : '#E8E8E8';
              return (
                <View key={dateStr} style={styles.miniDayCol}>
                  <View style={[styles.miniSquare, { backgroundColor: bgColor }]} />
                  <Text style={[styles.miniDayLabel, { color: colors.textSecondary }]}>
                    {getDayLabel(dateStr)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Quick insight card */}
      {topCorrelation && insightDiff && parseFloat(insightDiff) > 0 && (
        <View style={[styles.insightCard, cardShadow]}>
          <View style={[styles.insightBorder, { backgroundColor: colors.primary }]} />
          <View style={styles.insightContent}>
            <Text style={[styles.insightText, { color: colors.text }]}>
              Los dias que {topCorrelation.name.toLowerCase()} tu animo mejora +{insightDiff}
            </Text>
          </View>
        </View>
      )}

      {/* Wellness tips */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Para tu bienestar</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tipsRow}
      >
        {WELLNESS_TIPS.map((tip, i) => (
          <View key={i} style={[styles.tipCard, cardShadow, { backgroundColor: colors.accent }]}>
            <Text style={[styles.tipText, { color: colors.text }]}>{tip}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Directorio de profesionales (carousel) */}
      {loaded && professionals.length > 0 && (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {hasPsych ? 'Descubrí otros profesionales' : 'Encontrá tu profesional'}
            </Text>
            {!hasPsych && (
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                Conectate con un psicólogo desde la app
              </Text>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.profRow}>
            {professionals.map((psych) => (
              <TouchableOpacity
                key={psych.id}
                style={[styles.profCarouselCard, cardShadow]}
                activeOpacity={0.85}
                onPress={() => openProfessional(psych)}
              >
                <View style={[styles.profAvatar, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.profAvatarText, { color: colors.primary }]}>
                    {psych.name?.replace('Lic. ', '').split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                  </Text>
                </View>
                <Text style={[styles.profCardName, { color: colors.text }]} numberOfLines={1}>{psych.name}</Text>
                <Text style={[styles.profCardSpec, { color: colors.textSecondary }]} numberOfLines={2}>{psych.specialty}</Text>
                <View style={styles.profCardFooter}>
                  <Text style={[styles.profCardRating, { color: colors.text }]}>{`⭐ ${psych.rating}`}</Text>
                  <Text style={[styles.profCardStatus, { color: psych.accepting ? colors.success : colors.textSecondary }]}>
                    {psych.accepting ? 'Disponible' : 'Sin cupos'}
                  </Text>
                </View>
                <View style={[styles.profCardBtn, { backgroundColor: colors.primary }]}>
                  <Text style={styles.profCardBtnText}>Ver perfil</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* Mood Registration Modal */}
      <MoodRegistrationModal
        visible={modalVisible}
        onClose={handleModalClose}
        onSaved={handleModalSaved}
      />

      {/* Professional profile Modal */}
      <ProfessionalModal
        professional={selectedProf}
        visible={profModalVisible}
        onClose={() => setProfModalVisible(false)}
      />

      {/* Popup de notificaciones al entrar */}
      <NotificationPopup
        visible={notifVisible}
        messages={notifMessages}
        onClose={dismissNotifPopup}
      />

      {/* Centro de notificaciones (campanita) */}
      <NotificationsModal
        visible={notifCenterVisible}
        messages={messages}
        onClose={() => setNotifCenterVisible(false)}
      />
    </AppContainer>
  );
}

const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLogo: {
    width: 120,
    height: 44,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  date: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    marginTop: 4,
    marginBottom: 24,
    textTransform: 'capitalize',
  },

  // Today's summary card
  todayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  todayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  todayCheckCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayCheckText: {
    fontSize: 16,
    color: '#27AE60',
    fontFamily: 'Outfit_600SemiBold',
  },
  todayRegistered: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  todayScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  todayEmoji: {
    fontSize: 36,
  },
  todayScore: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  todayEmotionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  emotionTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  emotionTagText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  editBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Register prompt card (when no entry today)
  registerPromptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  registerPromptText: {
    fontSize: 17,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    marginBottom: 4,
  },
  registerPromptSub: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },

  // Mini history
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  miniHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  miniDayCol: {
    alignItems: 'center',
    gap: 6,
  },
  miniSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  miniDayLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },

  // Insight card
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginBottom: 20,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  insightBorder: {
    width: 4,
  },
  insightContent: {
    flex: 1,
    padding: 20,
  },
  insightText: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
    lineHeight: 22,
  },

  // Sections
  sectionHeaderRow: {
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay_700Bold',
  },

  // Psychologist cards
  psychCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  psychInfo: {
    flex: 1,
    gap: 4,
  },
  psychName: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  psychSpecialty: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  psychRating: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    marginTop: 2,
  },
  psychLink: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Professionals carousel
  sectionSub: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  profRow: {
    gap: 12,
    paddingBottom: 4,
    marginBottom: 20,
  },
  profCarouselCard: {
    width: 210,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
  },
  profAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profAvatarText: {
    fontSize: 16,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  profCardName: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  profCardSpec: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
    minHeight: 34,
  },
  profCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  profCardRating: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  profCardStatus: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },
  profCardBtn: {
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
  },
  profCardBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Wellness tips
  tipsRow: {
    gap: 12,
    paddingBottom: 4,
    marginBottom: 20,
  },
  tipCard: {
    width: 180,
    borderRadius: 24,
    padding: 20,
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    lineHeight: 20,
  },

  // Messages
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 10,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  messageFrom: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  messageTime: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  messageBody: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 22,
  },

  // Tasks
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  taskDescription: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
    flex: 1,
    lineHeight: 22,
  },
  taskCompleteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  taskCompleteBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  completedTasksSection: {
    marginBottom: 8,
  },
  taskCardCompleted: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    opacity: 0.7,
  },
  taskCheckmark: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
  },
  taskDescriptionCompleted: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    textDecorationLine: 'line-through',
    flex: 1,
  },
});
