import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppContainer from '../../components/AppContainer';
import { TEAL } from '../../constants/palette';
import { useTheme } from '../../lib/theme-context';
import { useAuth } from '../../lib/auth-context';
import { createJournalEntry, getJournalEntries } from '../../lib/database';
import { encryptText, decryptText } from '../../lib/crypto';
import { getRandomPrompts, categories, getPromptsByCategory, JournalPrompt } from '../../constants/prompts';

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let r = '';
  for (let i = 0; i < 20; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function JournalScreen() {
  const { colors } = useTheme();
  const { user, encryptionKey } = useAuth();
  const [prompts, setPrompts] = useState<JournalPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<JournalPrompt | null>(null);
  const [response, setResponse] = useState('');
  const [pastEntries, setPastEntries] = useState<any[]>([]);
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<'write' | 'history'>('write');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setPrompts(getRandomPrompts(3));
    const entries = await getJournalEntries(user.id, 20);
    setPastEntries(entries);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    const catPrompts = getPromptsByCategory(cat);
    setPrompts(catPrompts);
    setSelectedPrompt(null);
  };

  const handleSave = async () => {
    if (!response.trim() || !user || !encryptionKey) return;
    const id = generateId();
    const encrypted = encryptText(response, encryptionKey);
    await createJournalEntry(id, user.id, todayStr(), selectedPrompt?.question || null, encrypted);
    setSaved(true);
    setResponse('');
    setSelectedPrompt(null);
    await loadData();
    setTimeout(() => setSaved(false), 2500);
  };

  const decryptResponse = (encrypted: string): string => {
    if (!encryptionKey) return '';
    try {
      return decryptText(encrypted, encryptionKey);
    } catch {
      return '[Error al desencriptar]';
    }
  };

  return (
    <AppContainer>
        <Text style={[styles.title, { color: colors.text }]}>Journal</Text>

        {/* Mode toggle */}
        <View style={[styles.modeRow, { backgroundColor: colors.bg }]}>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              mode === 'write'
                ? { backgroundColor: colors.primary }
                : { backgroundColor: '#FFFFFF', ...cardShadow },
            ]}
            onPress={() => setMode('write')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.modeBtnText,
                { color: mode === 'write' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Escribir
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              mode === 'history'
                ? { backgroundColor: colors.primary }
                : { backgroundColor: '#FFFFFF', ...cardShadow },
            ]}
            onPress={() => setMode('history')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.modeBtnText,
                { color: mode === 'history' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Anteriores
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'write' ? (
          <>
            {/* Category pills */}
            <View style={[styles.card, cardShadow]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Elegi una categoria</Text>
              <View style={styles.catRow}>
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catPill,
                        isSelected
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : { backgroundColor: '#FFFFFF', borderColor: colors.border },
                      ]}
                      onPress={() => handleSelectCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.catText,
                          { color: isSelected ? '#FFFFFF' : colors.text },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Prompts */}
            <View style={[styles.card, cardShadow]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {selectedPrompt ? 'Responde:' : 'Elegi una pregunta'}
              </Text>

              {selectedPrompt ? (
                <View>
                  <View style={[styles.promptSelected, { backgroundColor: '#f6f3f2' }]}>
                    <Text style={[styles.promptText, { color: colors.primary }]}>
                      {selectedPrompt.categoryEmoji} {selectedPrompt.question}
                    </Text>
                  </View>
                  <View style={[styles.encryptedBadge, { backgroundColor: TEAL + '1F' }]}>
                    <Ionicons name="lock-closed" size={12} color={TEAL} />
                    <Text style={[styles.encryptedText, { color: TEAL }]}>
                      Tu respuesta se guarda encriptada
                    </Text>
                  </View>
                  <TextInput
                    style={[styles.responseInput, { backgroundColor: '#f6f3f2', color: colors.text }]}
                    placeholder="Escribi tu reflexion..."
                    placeholderTextColor={colors.textSecondary}
                    value={response}
                    onChangeText={setResponse}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                  />
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.cancelBtn, { backgroundColor: '#FFFFFF', ...cardShadow }]}
                      onPress={() => { setSelectedPrompt(null); setResponse(''); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.saveBtn,
                        { backgroundColor: saved ? colors.success : colors.primary },
                      ]}
                      onPress={handleSave}
                      disabled={saved}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.saveBtnText}>{saved ? '✓ Guardado!' : 'Guardar'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                prompts.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.promptCard, cardShadow]}
                    onPress={() => setSelectedPrompt(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.promptEmoji}>{p.categoryEmoji}</Text>
                    <Text style={[styles.promptQuestion, { color: colors.text }]}>
                      {p.question}
                    </Text>
                  </TouchableOpacity>
                ))
              )}

              {!selectedPrompt && (
                <TouchableOpacity
                  onPress={() => setPrompts(getRandomPrompts(3))}
                  style={styles.refreshBtn}
                >
                  <Text style={[styles.refreshText, { color: colors.secondary }]}>
                    🔄 Otras preguntas
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Free write */}
            {!selectedPrompt && (
              <TouchableOpacity
                style={[styles.freeWriteBtn, { borderColor: colors.border }]}
                onPress={() =>
                  setSelectedPrompt({
                    id: 'free',
                    category: 'Libre',
                    categoryEmoji: '📝',
                    question: 'Escritura libre',
                  })
                }
                activeOpacity={0.7}
              >
                <Text style={[styles.freeWriteText, { color: colors.textSecondary }]}>
                  ✍️ O escribi libremente sin pregunta guia
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          /* History mode */
          pastEntries.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              No hay entradas de journal aun
            </Text>
          ) : (
            pastEntries.map((entry) => (
              <View key={entry.id} style={[styles.historyCard, cardShadow]}>
                <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                  {entry.date}
                </Text>
                {entry.prompt && (
                  <Text style={[styles.historyPrompt, { color: colors.primary }]}>
                    {entry.prompt}
                  </Text>
                )}
                <Text style={[styles.historyResponse, { color: colors.text }]}>
                  {decryptResponse(entry.response_encrypted)}
                </Text>
              </View>
            ))
          )
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
    marginBottom: 20,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    padding: 4,
    borderRadius: 9999,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9999,
    alignItems: 'center',
  },
  modeBtnText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: 'PlayfairDisplay_700Bold',
    marginBottom: 16,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
  },
  catText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    gap: 12,
  },
  promptEmoji: { fontSize: 24 },
  promptQuestion: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    flex: 1,
    lineHeight: 20,
  },
  promptSelected: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  promptText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  encryptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    marginBottom: 12,
  },
  encryptedText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  responseInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    minHeight: 140,
  },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  saveBtn: {
    flex: 2,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  refreshBtn: { marginTop: 8, alignItems: 'center' },
  refreshText: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  freeWriteBtn: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
  },
  freeWriteText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  empty: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    marginTop: 40,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  historyPrompt: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 8,
  },
  historyResponse: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 22,
  },
});
