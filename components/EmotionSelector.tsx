import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { emotionTree, EmotionPrimary } from '../constants/emotions';

const emotionPrompts = [
  '¿Qué sentís en este momento?',
  '¿Qué emociones te acompañan hoy?',
  '¿Cómo te encontrás?',
  '¿Qué hay en tu interior ahora?',
  '¿Qué emociones están presentes?',
  '¿Qué sentimientos te habitan hoy?',
  '¿Cómo viene el día por dentro?',
  '¿Qué te está acompañando hoy?',
  '¿Qué emociones reconocés ahora?',
  '¿Cómo estás por dentro?',
];

const scorePrompts = [
  'Si le pusieras un puntaje a tu día, ¿cuánto sería?',
  '¿Cómo calificarías tu día hasta ahora?',
  'Del 1 al 10, ¿cómo viene tu día?',
  '¿Qué número le pondrías a este momento?',
];

interface EmotionSelectorProps {
  selectedEmotions: string[];
  onEmotionsChange: (emotions: string[]) => void;
  score: number;
  onScoreChange: (score: number) => void;
}

export default function EmotionSelector({
  selectedEmotions, onEmotionsChange, score, onScoreChange,
}: EmotionSelectorProps) {
  const [selectedPrimary, setSelectedPrimary] = useState<EmotionPrimary | null>(null);
  const prompt = useMemo(() => emotionPrompts[Math.floor(Math.random() * emotionPrompts.length)], []);
  const scorePrompt = useMemo(() => scorePrompts[Math.floor(Math.random() * scorePrompts.length)], []);

  // Get ALL leaf emotions for a primary (flatten secondary → tertiary)
  const getAllLeaves = (primary: EmotionPrimary) => {
    const leaves: { code: string; label: string; secondaryLabel: string }[] = [];
    for (const sec of primary.children) {
      // Add the secondary label itself as a selectable item
      leaves.push({ code: sec.children[0]?.code || '', label: sec.label, secondaryLabel: sec.label });
      // Add all tertiary children
      for (const leaf of sec.children) {
        leaves.push({ code: leaf.code, label: leaf.label, secondaryLabel: sec.label });
      }
    }
    return leaves;
  };

  const handlePrimaryTap = (primary: EmotionPrimary) => {
    setSelectedPrimary(primary);
  };

  const handleLeafTap = (code: string) => {
    if (selectedEmotions.includes(code)) {
      onEmotionsChange(selectedEmotions.filter((c) => c !== code));
    } else if (selectedEmotions.length < 2) {
      onEmotionsChange([...selectedEmotions, code]);
    }
  };

  const handleBack = () => {
    setSelectedPrimary(null);
  };

  const removeEmotion = (code: string) => {
    onEmotionsChange(selectedEmotions.filter((c) => c !== code));
  };

  const getLabel = (code: string): string => {
    for (const p of emotionTree) {
      for (const s of p.children) {
        for (const l of s.children) {
          if (l.code === code) return l.label;
        }
      }
    }
    return code;
  };

  const getColor = (code: string): { bg: string; border: string } => {
    const prefix = code.substring(0, 2);
    const map: Record<string, string> = {
      AL: 'alegria', SO: 'sorpresa', TR: 'tristeza',
      DI: 'disgusto', IR: 'ira', MI: 'miedo',
    };
    const primary = emotionTree.find((e) => e.id === map[prefix]);
    return { bg: primary?.color || '#eee', border: primary?.colorDark || '#ccc' };
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{prompt}</Text>
      <Text style={styles.counter}>{selectedEmotions.length}/2 seleccionados</Text>

      {/* Selected emotions chips */}
      {selectedEmotions.length > 0 && (
        <View style={styles.selectedRow}>
          {selectedEmotions.map((code) => {
            const { bg, border } = getColor(code);
            return (
              <TouchableOpacity
                key={code}
                style={[styles.selectedChip, { backgroundColor: bg, borderColor: border }]}
                onPress={() => removeEmotion(code)}
              >
                <Text style={styles.selectedChipText}>{getLabel(code)}</Text>
                <Text style={styles.selectedChipX}>x</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Layer 1: Primary emotions */}
      {!selectedPrimary && (
        <View style={styles.primaryGrid}>
          {emotionTree.map((primary) => (
            <TouchableOpacity
              key={primary.id}
              style={[styles.primaryPill, { backgroundColor: primary.color, borderColor: primary.colorDark }]}
              onPress={() => handlePrimaryTap(primary)}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryPillText}>{primary.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Layer 2: All emotions of selected primary (grouped by secondary) */}
      {selectedPrimary && (
        <View>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Emociones</Text>
          </TouchableOpacity>

          {selectedPrimary.children.map((secondary, i) => (
            <View key={i} style={styles.secondaryGroup}>
              <Text style={[styles.secondaryLabel, { color: selectedPrimary.colorDark }]}>
                {secondary.label}
              </Text>
              <View style={styles.leafRow}>
                {secondary.children.map((leaf) => {
                  const isSelected = selectedEmotions.includes(leaf.code);
                  const isDisabled = !isSelected && selectedEmotions.length >= 2;
                  return (
                    <TouchableOpacity
                      key={leaf.code}
                      style={[
                        styles.leafPill,
                        { backgroundColor: selectedPrimary.color },
                        isSelected && {
                          borderColor: selectedPrimary.colorDark,
                          shadowColor: selectedPrimary.colorDark,
                          shadowOpacity: 0.4,
                          shadowRadius: 8,
                          elevation: 4,
                        },
                      ]}
                      onPress={() => handleLeafTap(leaf.code)}
                      activeOpacity={0.7}
                      disabled={isDisabled}
                    >
                      <Text style={[
                        styles.leafPillText,
                        isSelected && { fontFamily: 'Outfit_600SemiBold' },
                        isDisabled && { opacity: 0.35 },
                      ]}>
                        {leaf.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Score */}
      <View style={styles.scoreSection}>
        <Text style={styles.scoreTitle}>{scorePrompt}</Text>
        <View style={styles.dotsContainer}>
          <View style={styles.dotsLine} />
          <View style={styles.dotsRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
              const isActive = n === score;
              return (
                <TouchableOpacity
                  key={n}
                  style={[styles.dot, isActive && styles.dotActive]}
                  onPress={() => onScoreChange(n)}
                >
                  <Text style={[styles.dotText, isActive && styles.dotTextActive]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={styles.dotsLabels}>
          <Text style={styles.dotLabel}>Muy mal</Text>
          <Text style={styles.dotLabel}>Excelente</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  title: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontStyle: 'italic',
    color: '#1c1b1b',
    textAlign: 'center',
    marginBottom: 4,
  },
  counter: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: '#787586',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Selected chips
  selectedRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 2,
    gap: 6,
  },
  selectedChipText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#1c1b1b' },
  selectedChipX: { fontSize: 14, fontFamily: 'Outfit_500Medium', color: '#787586' },

  // Primary grid (2 columns)
  primaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  primaryPill: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    minWidth: '45%' as any,
    alignItems: 'center',
    flexGrow: 1,
  },
  primaryPillText: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: '#1c1b1b' },

  // Back button
  backBtn: { marginBottom: 16 },
  backBtnText: { fontSize: 14, fontFamily: 'Outfit_500Medium', color: '#6C5CE7' },

  // Secondary groups
  secondaryGroup: { marginBottom: 16 },
  secondaryLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  leafRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  leafPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  leafPillText: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: '#1c1b1b' },

  // Score
  scoreSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f0edec' },
  scoreTitle: {
    fontSize: 16,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontStyle: 'italic',
    color: '#1c1b1b',
    marginBottom: 16,
    textAlign: 'center',
  },
  dotsContainer: { position: 'relative', marginBottom: 8 },
  dotsLine: {
    position: 'absolute',
    top: '50%',
    left: 14,
    right: 14,
    height: 2,
    backgroundColor: '#ebe7e7',
    marginTop: -1,
  },
  dotsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dot: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#ebe7e7',
    justifyContent: 'center', alignItems: 'center',
  },
  dotActive: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#6C5CE7', borderColor: '#6C5CE7',
    marginTop: -3,
  },
  dotText: { fontSize: 11, fontFamily: 'Outfit_500Medium', color: '#787586' },
  dotTextActive: { color: '#ffffff', fontFamily: 'Outfit_600SemiBold' },
  dotsLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  dotLabel: { fontSize: 11, fontFamily: 'Outfit_400Regular', color: '#787586' },
});
