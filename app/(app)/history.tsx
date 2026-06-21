import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AppContainer from '../../components/AppContainer';
import { useTheme } from '../../lib/theme-context';
import { useAuth } from '../../lib/auth-context';
import { getAllMoodEntries, getEntryActivities } from '../../lib/database';
import { decryptText } from '../../lib/crypto';
import { moodScoreToEmoji, moodScoreToColor } from '../../constants/themes';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { user, encryptionKey } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [entryActivities, setEntryActivities] = useState<{ [key: string]: any[] }>({});

  const loadEntries = useCallback(async () => {
    if (!user) return;
    const data = await getAllMoodEntries(user.id);
    setEntries(data);
  }, [user]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const toggleExpand = async (entryId: string) => {
    if (expandedId === entryId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(entryId);
    if (!entryActivities[entryId]) {
      const acts = await getEntryActivities(entryId);
      setEntryActivities((prev) => ({ ...prev, [entryId]: acts }));
    }
  };

  const decryptNotes = (encrypted: string | null): string => {
    if (!encrypted || !encryptionKey) return '';
    try {
      return decryptText(encrypted, encryptionKey);
    } catch {
      return '[Error al desencriptar]';
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  // Build a simple calendar grid for the last 35 days
  const last35 = Array.from({ length: 35 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (34 - i));
    return d.toISOString().split('T')[0];
  });

  const entryMap = Object.fromEntries(entries.map((e) => [e.date, e]));

  return (
    <AppContainer>
        <Text style={[styles.title, { color: colors.text }]}>Historial</Text>

        {/* Mini calendar */}
        <View style={[styles.card, cardShadow]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>ULTIMOS 35 DIAS</Text>
          <View style={styles.calendarGrid}>
            {last35.map((date) => {
              const entry = entryMap[date];
              return (
                <View
                  key={date}
                  style={[
                    styles.calendarDot,
                    {
                      backgroundColor: entry
                        ? moodScoreToColor(entry.score, colors)
                        : colors.border,
                    },
                  ]}
                />
              );
            })}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>1-2</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>3-4</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.textSecondary }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>5-6</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>7-8</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>9-10</Text>
            </View>
          </View>
        </View>

        {/* Entry list */}
        {entries.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            No hay registros aun. Empieza registrando tu dia!
          </Text>
        ) : (
          entries.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={[styles.entryCard, cardShadow]}
              onPress={() => toggleExpand(entry.id)}
              activeOpacity={0.7}
            >
              <View style={styles.entryHeader}>
                <Text style={[styles.entryDate, { color: colors.textSecondary }]}>
                  {formatDate(entry.date)}
                </Text>
                <View style={styles.entryScoreRow}>
                  <Text style={styles.entryEmoji}>{moodScoreToEmoji(entry.score)}</Text>
                  <Text style={[styles.entryScore, { color: moodScoreToColor(entry.score, colors) }]}>
                    {entry.score}/10
                  </Text>
                </View>
              </View>

              {expandedId === entry.id && (
                <View style={styles.entryExpanded}>
                  {entryActivities[entry.id] && entryActivities[entry.id].length > 0 && (
                    <View style={styles.entryActRow}>
                      {entryActivities[entry.id].map((act: any) => (
                        <View key={act.id} style={[styles.miniChip, { backgroundColor: colors.bg }]}>
                          <Text style={[styles.miniChipText, { color: colors.text }]}>
                            {act.emoji} {act.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {entry.notes_encrypted && (
                    <View style={[styles.notesBox, { backgroundColor: colors.bg }]}>
                      <View style={styles.notesLabelRow}>
                        <View style={[styles.encryptedBadge, { backgroundColor: '#E8F5E9' }]}>
                          <Text style={[styles.encryptedBadgeText, { color: colors.success }]}>
                            🔒 Nota encriptada
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.notesText, { color: colors.text }]}>
                        {decryptNotes(entry.notes_encrypted)}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
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
  title: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_700Bold',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'flex-start',
  },
  calendarDot: { width: 32, height: 32, borderRadius: 8 },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginTop: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, fontFamily: 'Outfit_400Regular' },
  empty: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    marginTop: 40,
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 10,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDate: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    textTransform: 'capitalize',
  },
  entryScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entryEmoji: { fontSize: 24 },
  entryScore: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  entryExpanded: { marginTop: 16 },
  entryActRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  miniChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  miniChipText: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },
  notesBox: {
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
  },
  notesLabelRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  encryptedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  encryptedBadgeText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  notesText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 22,
  },
});
