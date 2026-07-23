import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Modal,
  ScrollView, Dimensions, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import EmotionSelector from './EmotionSelector';
import { GREY_INK, TEAL, CORAL } from '../constants/palette';
import { useTheme } from '../lib/theme-context';
import { useAuth } from '../lib/auth-context';
import { getActivities, createMoodEntry, createActivity, getMoodEntries, getPatientPsych } from '../lib/database';
import { encryptText } from '../lib/crypto';

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let r = '';
  for (let i = 0; i < 20; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

function todayStr() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface MoodRegistrationModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function MoodRegistrationModal({ visible, onClose, onSaved }: MoodRegistrationModalProps) {
  const { colors } = useTheme();
  const { user, encryptionKey } = useAuth();
  const [score, setScore] = useState(5);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [newActivityName, setNewActivityName] = useState('');
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [hasPsych, setHasPsych] = useState(false);
  const [shareWithPsych, setShareWithPsych] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [showSuccess, setShowSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const successOpacity = useState(new Animated.Value(0))[0];

  const loadData = useCallback(async () => {
    if (!user) return;
    const acts = await getActivities(user.id);
    setActivities(acts);
    const entries = await getMoodEntries(user.id, 1);
    if (entries.length > 0 && entries[0].date === todayStr()) {
      setTodayEntry(entries[0]);
      setScore(entries[0].score);
    }
    const psych = await getPatientPsych(user.id);
    setHasPsych(!!psych);
    setShareWithPsych(!!psych);
  }, [user]);

  useEffect(() => {
    if (visible) loadData();
  }, [visible, loadData]);

  const toggleActivity = (id: string) => {
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleAddActivity = async () => {
    if (!newActivityName.trim() || !user) return;
    setErrorMsg('');
    try {
      const id = generateId();
      await createActivity(id, user.id, newActivityName.trim(), '', colors.primary);
      setNewActivityName('');
      setShowAddActivity(false);
      await loadData();
    } catch (e: any) {
      console.error('createActivity failed', e);
      setErrorMsg('No se pudo agregar la actividad: ' + (e?.message ?? 'error'));
    }
  };

  const handleSave = async () => {
    if (!user || saving) return;
    if (!encryptionKey) {
      setErrorMsg('Tu sesión se restauró sin la clave de encriptación. Cerrá sesión y volvé a iniciar para guardar.');
      return;
    }
    setErrorMsg('');
    setSaving(true);
    try {
      const id = generateId();
      let encryptedNotes: string | null = null;
      if (notes.trim()) {
        encryptedNotes = encryptText(notes, encryptionKey);
      }
      await createMoodEntry(id, user.id, todayStr(), score, encryptedNotes, selectedActivities, selectedEmotions);
      setTodayEntry({ score });
    } catch (e: any) {
      console.error('createMoodEntry failed', e);
      setErrorMsg('No se pudo guardar el día: ' + (e?.message ?? 'error'));
      setSaving(false);
      return;
    }
    setSaving(false);

    // Show success animation
    setShowSuccess(true);
    Animated.timing(successOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      setShowSuccess(false);
      successOpacity.setValue(0);
      onSaved();
      onClose();
    }, 1800);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { height: SCREEN_HEIGHT * 0.9 }]}>
          {/* Drag handle */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={18} color={GREY_INK} />
            </TouchableOpacity>
          </View>

          {showSuccess ? (
            <Animated.View style={[styles.successOverlay, { opacity: successOpacity }]}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={40} color={TEAL} />
              </View>
              <Text style={styles.successTitle}>Dia registrado</Text>
              <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>Tu bienestar importa</Text>
            </Animated.View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {todayEntry ? (
                <View style={[styles.alreadyCard, cardShadow]}>
                  <Text style={[styles.alreadyText, { color: colors.textSecondary, fontFamily: 'Outfit_400Regular' }]}>
                    Ya registraste hoy - podes actualizar tu registro
                  </Text>
                </View>
              ) : null}

              {/* Emotion Selector */}
              <EmotionSelector
                selectedEmotions={selectedEmotions}
                onEmotionsChange={setSelectedEmotions}
                score={score}
                onScoreChange={setScore}
              />

              {/* Activities */}
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>¿Que has estado haciendo?</Text>
              </View>
              <View style={styles.activitiesWrap}>
                {activities.map((act) => {
                  const selected = selectedActivities.includes(act.id);
                  return (
                    <TouchableOpacity
                      key={act.id}
                      style={[
                        styles.activityChip,
                        selected
                          ? { backgroundColor: colors.primary, borderColor: colors.primary, borderWidth: 1 }
                          : { backgroundColor: '#FFFFFF', borderColor: colors.border, borderWidth: 1 },
                      ]}
                      onPress={() => toggleActivity(act.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.activityText,
                          { color: selected ? '#FFFFFF' : colors.text },
                        ]}
                      >
                        {act.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.activityChip, styles.addChip, { borderColor: colors.border }]}
                  onPress={() => setShowAddActivity(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.activityText, { color: colors.textSecondary }]}>+ Agregar</Text>
                </TouchableOpacity>
              </View>

              {showAddActivity && (
                <View style={styles.addActivityRow}>
                  <TextInput
                    style={[styles.addActivityInput, { backgroundColor: '#f6f3f2', color: colors.text }]}
                    placeholder="Nombre de la actividad"
                    placeholderTextColor={colors.textSecondary}
                    value={newActivityName}
                    onChangeText={setNewActivityName}
                    onSubmitEditing={handleAddActivity}
                  />
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: colors.primary }]}
                    onPress={handleAddActivity}
                  >
                    <Text style={styles.addBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Notes */}
              <View style={[styles.card, cardShadow, { marginTop: 20 }]}>
                <View style={styles.notesTitleRow}>
                  <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>Notas del dia</Text>
                  <View style={[styles.encryptedBadge, { backgroundColor: TEAL + '1F' }]}>
                    <Ionicons name="lock-closed" size={11} color={TEAL} />
                    <Text style={[styles.encryptedText, { color: TEAL }]}>Encriptado</Text>
                  </View>
                </View>

                {/* Input mode toggle */}
                <View style={styles.inputModeRow}>
                  <TouchableOpacity
                    style={[styles.inputModeBtn, inputMode === 'text' && { backgroundColor: colors.primary }]}
                    onPress={() => setInputMode('text')}
                  >
                    <Text style={[styles.inputModeBtnText, inputMode === 'text' && { color: '#fff' }]}>
                      Escribir
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.inputModeBtn, inputMode === 'voice' && { backgroundColor: colors.primary }]}
                    onPress={() => setInputMode('voice')}
                  >
                    <Text style={[styles.inputModeBtnText, inputMode === 'voice' && { color: '#fff' }]}>
                      Grabar voz
                    </Text>
                  </TouchableOpacity>
                </View>

                {inputMode === 'text' ? (
                  <TextInput
                    style={[styles.notesInput, { backgroundColor: '#f6f3f2', color: colors.text }]}
                    placeholder="¿Algo que quieras recordar de hoy?"
                    placeholderTextColor={colors.textSecondary}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                ) : (
                  <View>
                    {!notes ? (
                      <TouchableOpacity
                        style={[styles.voiceBtn, isRecording && { backgroundColor: CORAL + '22', borderColor: CORAL }]}
                        onPress={() => {
                          if (isRecording) {
                            setIsRecording(false);
                            setNotes('(Transcripcion de voz aparecera aca. En produccion se usara Whisper API para transcribir el audio.)');
                          } else {
                            setIsRecording(true);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={isRecording ? 'stop-circle' : 'mic'} size={26} color={isRecording ? CORAL : GREY_INK} />
                        <Text style={[styles.voiceBtnText, { color: isRecording ? CORAL : colors.textSecondary }]}>
                          {isRecording ? 'Grabando... toca para detener' : 'Toca para grabar tu nota de voz'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View>
                        <Text style={[styles.voicePreviewLabel, { color: colors.textSecondary }]}>
                          Preview de la transcripcion (podes editarla):
                        </Text>
                        <TextInput
                          style={[styles.notesInput, { backgroundColor: '#f6f3f2', color: colors.text }]}
                          value={notes}
                          onChangeText={setNotes}
                          multiline
                          numberOfLines={4}
                          textAlignVertical="top"
                        />
                        <TouchableOpacity
                          style={styles.reRecordBtn}
                          onPress={() => { setNotes(''); setIsRecording(false); }}
                        >
                          <Text style={[styles.reRecordBtnText, { color: colors.primary }]}>Grabar de nuevo</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* Share with psychologist toggle */}
                {hasPsych && (
                  <TouchableOpacity
                    style={styles.shareRow}
                    onPress={() => setShareWithPsych(!shareWithPsych)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.shareToggle, shareWithPsych && { backgroundColor: colors.primary }]}>
                      <View style={[styles.shareToggleKnob, shareWithPsych && { alignSelf: 'flex-end' as const }]} />
                    </View>
                    <Text style={[styles.shareText, { color: colors.text }]}>
                      Compartir con mi profesional
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {errorMsg ? (
                <Text style={styles.errorMsg}>{errorMsg}</Text>
              ) : null}

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }, cardShadow, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                activeOpacity={0.8}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : 'Guardar dia'}</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,26,45,0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdropTouch: {
    flex: 1,
    alignSelf: 'stretch',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 560,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DEDAE6',
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F1F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Success overlay
  successOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: TEAL + '1F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  successTitle: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#1c1b1b',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },

  // Registration content styles
  alreadyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
  },
  alreadyText: { fontSize: 14, textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay_700Bold',
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  activitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    gap: 6,
  },
  addChip: {
    borderStyle: 'dashed',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  activityText: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  addActivityRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  addActivityInput: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  addBtn: {
    borderRadius: 16,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 22, fontFamily: 'Outfit_600SemiBold' },
  notesTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  encryptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  encryptedText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  inputModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    marginTop: 12,
  },
  inputModeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9999,
    alignItems: 'center',
    backgroundColor: '#f0edec',
  },
  inputModeBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: '#787586',
  },
  notesInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    minHeight: 100,
  },
  voiceBtn: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ebe7e7',
    borderStyle: 'dashed',
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  voiceBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    textAlign: 'center',
  },
  voicePreviewLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    marginBottom: 8,
  },
  reRecordBtn: {
    marginTop: 8,
    alignItems: 'center',
  },
  reRecordBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0edec',
  },
  shareToggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ddd9d9',
    padding: 3,
    justifyContent: 'center',
  },
  shareToggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
  },
  shareText: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    flex: 1,
  },
  errorMsg: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: CORAL,
    textAlign: 'center',
    marginTop: 12,
  },
  saveButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
  },
});
