import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, Platform, Image,
} from 'react-native';
import AppContainer from '../../components/AppContainer';
import { useTheme } from '../../lib/theme-context';
import { useAuth } from '../../lib/auth-context';
import { getActivities, createMoodEntry, createActivity, getMoodEntries } from '../../lib/database';
import { encryptText } from '../../lib/crypto';
import { moodScoreToEmoji, moodScoreToColor, moodGradientColors } from '../../constants/themes';

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

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user, encryptionKey } = useAuth();
  const [score, setScore] = useState(5);
  const [notes, setNotes] = useState('');
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [todayEntry, setTodayEntry] = useState<any>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    const acts = await getActivities(user.id);
    setActivities(acts);
    const entries = await getMoodEntries(user.id, 1);
    if (entries.length > 0 && entries[0].date === todayStr()) {
      setTodayEntry(entries[0]);
      setScore(entries[0].score);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleActivity = (id: string) => {
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleAddActivity = async () => {
    if (!newActivityName.trim() || !user) return;
    const emojis = ['🏃', '💪', '📚', '🎵', '🍳', '🧘', '💻', '🎮', '☕', '🌙', '🎨', '🤝', '📱', '🎯'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const id = generateId();
    await createActivity(id, user.id, newActivityName.trim(), emoji, colors.primary);
    setNewActivityName('');
    setShowAddActivity(false);
    await loadData();
  };

  const handleSave = async () => {
    if (!user || !encryptionKey) return;
    const id = generateId();
    let encryptedNotes: string | null = null;
    if (notes.trim()) {
      encryptedNotes = encryptText(notes, encryptionKey);
    }
    await createMoodEntry(id, user.id, todayStr(), score, encryptedNotes, selectedActivities);
    setSaved(true);
    setTodayEntry({ score });
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AppContainer>
        {/* Header */}
        <Image
          source={require('../../assets/nunis-logo.jpg')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <Text style={[styles.greeting, { color: colors.text }]}>
          Hola, {user?.name?.split(' ')[0]}
        </Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>

        {todayEntry && !saved ? (
          <View style={[styles.alreadyCard, cardShadow]}>
            <Text style={[styles.alreadyText, { color: colors.textSecondary, fontFamily: 'Outfit_400Regular' }]}>
              Ya registraste hoy: {moodScoreToEmoji(todayEntry.score)} ({todayEntry.score}/10)
            </Text>
            <Text style={[styles.alreadySubtext, { color: colors.textSecondary, fontFamily: 'Outfit_400Regular' }]}>
              Podes actualizar tu registro abajo
            </Text>
          </View>
        ) : null}

        {/* Mood Score Card */}
        <View style={[styles.card, cardShadow]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>¿Como te sientes ahora?</Text>
          <Text style={styles.moodEmoji}>{moodScoreToEmoji(score)}</Text>

          <View style={styles.circlesRow}>
            {moodGradientColors.map((color, i) => {
              const n = i + 1;
              const isSelected = n === score;
              return (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.moodCircle,
                    {
                      backgroundColor: color,
                      width: isSelected ? 38 : 28,
                      height: isSelected ? 38 : 28,
                      borderRadius: isSelected ? 19 : 14,
                    },
                  ]}
                  onPress={() => setScore(n)}
                  activeOpacity={0.7}
                />
              );
            })}
          </View>
          <View style={styles.moodLabelsRow}>
            <Text style={[styles.moodLabel, { color: colors.textSecondary }]}>CRITICO</Text>
            <Text style={[styles.moodLabel, { color: colors.textSecondary }]}>NEUTRAL</Text>
            <Text style={[styles.moodLabel, { color: colors.textSecondary }]}>RADIANTE</Text>
          </View>
        </View>

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
                <Text style={styles.activityEmoji}>{act.emoji}</Text>
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
            <Text style={[styles.cardTitle, { color: colors.text }]}>Notas del dia</Text>
            <View style={[styles.encryptedBadge, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.encryptedText, { color: colors.success }]}>🔒 Encriptado</Text>
            </View>
          </View>
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
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: saved ? colors.success : colors.primary },
            cardShadow,
          ]}
          onPress={handleSave}
          disabled={saved}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>
            {saved ? '✓ Guardado!' : 'Guardar dia'}
          </Text>
        </TouchableOpacity>
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
  headerLogo: {
    width: 120,
    height: 44,
    marginBottom: 16,
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
  alreadyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
  },
  alreadyText: { fontSize: 14, textAlign: 'center' },
  alreadySubtext: { fontSize: 12, textAlign: 'center', marginTop: 4 },
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
  moodEmoji: { fontSize: 52, textAlign: 'center', marginBottom: 20 },
  circlesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  moodCircle: {
    // width/height/borderRadius set dynamically
  },
  moodLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  moodLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 1,
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
  activityEmoji: { fontSize: 16 },
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  encryptedText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  notesInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    minHeight: 100,
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
