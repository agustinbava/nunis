import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Platform,
} from 'react-native';
import AppContainer from '../../components/AppContainer';
import PatientAgendaModal from '../../components/PatientAgendaModal';
import { useRouter } from 'expo-router';
import { useTheme } from '../../lib/theme-context';
import { useAuth } from '../../lib/auth-context';
import {
  updateUserTheme, getActivities, deleteActivity, createActivity,
  getPatientPsych, getUserByShareCode, linkPatientToPsych, unlinkPatient,
} from '../../lib/database';
import { personalities, Personality } from '../../constants/themes';

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let r = '';
  for (let i = 0; i < 20; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<any[]>([]);
  const [psychLink, setPsychLink] = useState<any>(null);
  const [agendaVisible, setAgendaVisible] = useState(false);
  const [psychCode, setPsychCode] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;
    const acts = await getActivities(user.id);
    setActivities(acts);
    const link = await getPatientPsych(user.id);
    setPsychLink(link);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleChangePersonality = async (p: Personality) => {
    if (!user) return;
    await updateUserTheme(
      user.id, p.colors.primary, p.colors.secondary, p.colors.accent,
      p.colors.bg, p.colors.card, p.colors.text, p.id
    );
    await refreshUser();
  };

  const handleDeleteActivity = async (id: string) => {
    await deleteActivity(id);
    await loadData();
  };

  const handleLinkPsych = async () => {
    if (!psychCode.trim() || !user) return;
    setLinkError('');
    setLinkSuccess('');
    const psych = await getUserByShareCode(psychCode.trim().toUpperCase());
    if (!psych) {
      setLinkError('Codigo no encontrado');
      return;
    }
    if (psych.role !== 'psychologist') {
      setLinkError('Ese codigo no pertenece a un/a profesional');
      return;
    }
    if (psych.id === user.id) {
      setLinkError('No podes vincularte a vos mismo');
      return;
    }
    const id = generateId();
    await linkPatientToPsych(id, psych.id, user.id);
    setLinkSuccess(`Vinculado con ${psych.name}`);
    setPsychCode('');
    await loadData();
  };

  const handleUnlink = async () => {
    if (!psychLink) return;
    await unlinkPatient(psychLink.id);
    setPsychLink(null);
    await loadData();
  };

  const handleLogout = async () => {
    await logout();
    if (Platform.OS === 'web') {
      // Recarga completa: garantiza el estado deslogueado sin depender del router.
      window.location.assign('/');
    } else {
      router.replace('/');
    }
  };

  const codeInputRef = useRef<TextInput>(null);

  // Split psych code into individual characters for display
  const codeChars = psychCode.padEnd(6, ' ').split('').slice(0, 6);

  return (
    <AppContainer>
        {/* User info - centered */}
        <View style={styles.userSection}>
          <Text style={[styles.userName, { color: colors.text }]}>{user?.name}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
          <View style={[styles.planBadge, { backgroundColor: user?.role === 'psychologist' ? '#E8F5E9' : colors.accent }]}>
            <Text style={[styles.planBadgeText, { color: user?.role === 'psychologist' ? '#27AE60' : colors.primary }]}>
              {user?.role === 'psychologist' ? 'Profesional' : 'Miembro'}
            </Text>
          </View>
          <Text style={[styles.shareCode, { color: colors.textSecondary }]}>
            Tu codigo:{' '}
            <Text style={{ color: colors.primary, fontFamily: 'Outfit_600SemiBold' }}>
              {user?.share_code}
            </Text>
          </Text>
        </View>

        {/* Privacy badge */}
        <View style={[styles.privacyBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.privacyIcon}>🛡️</Text>
          <View style={styles.privacyTextContainer}>
            <Text style={styles.privacyTitle}>Privacidad de grado medico</Text>
            <Text style={styles.privacyDescription}>
              Tus notas y journal se guardan encriptadas. Solo vos podes leerlas.
            </Text>
          </View>
        </View>

        {/* Personality / Theme */}
        <View style={[styles.card, cardShadow]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Personalizar Tema</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Elegi la estetica que te represente
          </Text>
          <View style={styles.personalityGrid}>
            {personalities.map((p) => {
              const isSelected = user?.personality === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.personalityCard,
                    cardShadow,
                    isSelected && { borderColor: p.colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => handleChangePersonality(p)}
                  activeOpacity={0.7}
                >
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: p.colors.primary }]}>
                      <Text style={styles.checkIcon}>✓</Text>
                    </View>
                  )}
                  <View style={styles.colorDotsRow}>
                    <View style={[styles.colorDot, { backgroundColor: p.colors.primary }]} />
                    <View style={[styles.colorDot, { backgroundColor: p.colors.secondary }]} />
                  </View>
                  <Text style={[styles.personalityName, { color: colors.text }]}>{p.name}</Text>
                  <Text style={[styles.personalityDesc, { color: colors.textSecondary }]}>
                    {p.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Activities management */}
        <View style={[styles.card, cardShadow]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Mis actividades</Text>
          {activities.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              Agrega actividades desde la pantalla "Hoy"
            </Text>
          ) : (
            activities.map((act) => (
              <View
                key={act.id}
                style={[styles.activityRow, { borderBottomColor: colors.bg }]}
              >
                <Text style={[styles.activityLabel, { color: colors.text }]}>
                  {act.emoji} {act.name}
                </Text>
                <TouchableOpacity onPress={() => handleDeleteActivity(act.id)}>
                  <Text style={[styles.deleteBtn, { color: colors.danger }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Psychologist link */}
        <View style={[styles.card, cardShadow]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Mi profesional</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Vincula tu cuenta con tu psicologo/a para que pueda ver tu progreso
          </Text>

          {psychLink ? (
            <View>
              <View style={[styles.linkedCard, { backgroundColor: colors.bg }]}>
                <Text style={[styles.linkedName, { color: colors.success }]}>
                  ✓ Vinculado con {psychLink.name}
                </Text>
                <Text style={[styles.linkedEmail, { color: colors.textSecondary }]}>
                  {psychLink.email}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.agendaBtn, { backgroundColor: colors.primary }]}
                onPress={() => setAgendaVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.agendaBtnText}>Ver turnos y reservar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unlinkBtn, cardShadow]}
                onPress={handleUnlink}
                activeOpacity={0.7}
              >
                <Text style={[styles.unlinkBtnText, { color: colors.danger }]}>Desvincular</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {/* Character boxes for code input */}
              <TouchableOpacity
                style={styles.codeBoxRow}
                onPress={() => codeInputRef.current?.focus()}
                activeOpacity={1}
              >
                {codeChars.map((char, i) => (
                  <View
                    key={i}
                    style={[
                      styles.codeBox,
                      {
                        backgroundColor: '#f6f3f2',
                        borderColor: char.trim() ? colors.primary : 'transparent',
                        borderWidth: char.trim() ? 1.5 : 0,
                      },
                    ]}
                  >
                    <Text style={[styles.codeBoxText, { color: colors.text }]}>
                      {char.trim() ? char : ''}
                    </Text>
                  </View>
                ))}
              </TouchableOpacity>
              <TextInput
                ref={codeInputRef}
                style={styles.hiddenInput}
                value={psychCode}
                onChangeText={(text) => setPsychCode(text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={6}
                autoCorrect={false}
              />
              {linkError ? (
                <Text style={[styles.error, { color: colors.danger }]}>{linkError}</Text>
              ) : null}
              {linkSuccess ? (
                <Text style={[styles.success, { color: colors.success }]}>{linkSuccess}</Text>
              ) : null}
              <TouchableOpacity
                style={[styles.linkBtn, { backgroundColor: colors.primary }]}
                onPress={handleLinkPsych}
                activeOpacity={0.8}
              >
                <Text style={styles.linkBtnText}>Vincular</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>Cerrar sesion</Text>
        </TouchableOpacity>

        <PatientAgendaModal
          visible={agendaVisible}
          patientId={user?.id || ''}
          onClose={() => setAgendaVisible(false)}
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
  // User section
  userSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 8,
  },
  userName: {
    fontSize: 26,
    fontFamily: 'PlayfairDisplay_700Bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 10,
  },
  planBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    marginBottom: 8,
  },
  planBadgeText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  shareCode: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    marginTop: 4,
  },

  // Privacy badge
  privacyBadge: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  privacyIcon: {
    fontSize: 28,
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  privacyDescription: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: 'PlayfairDisplay_700Bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 16,
  },

  // Theme grid
  personalityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  personalityCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  colorDotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  colorDot: { width: 18, height: 18, borderRadius: 9 },
  personalityName: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 2,
  },
  personalityDesc: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
  },

  // Activities
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  activityLabel: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
  },
  deleteBtn: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  empty: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    paddingVertical: 10,
  },

  // Psychologist link
  linkedCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  linkedName: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  linkedEmail: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  agendaBtn: {
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  agendaBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  unlinkBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  unlinkBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  codeBoxRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  codeBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeBoxText: {
    fontSize: 22,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  error: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    marginTop: 8,
    textAlign: 'center',
  },
  success: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    marginTop: 8,
    textAlign: 'center',
  },
  linkBtn: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  linkBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Logout
  logoutBtn: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 48, // separar de la tab bar flotante para que el click no caiga en ella
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    color: '#E74C3C',
  },
});
