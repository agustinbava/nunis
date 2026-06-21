import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppContainer from '../../components/AppContainer';
import { useTheme } from '../../lib/theme-context';
import { useAuth } from '../../lib/auth-context';
import { getCorrelationData, getAllMoodEntries } from '../../lib/database';
import { moodScoreToColor, moodScoreToEmoji } from '../../constants/themes';

export default function InsightsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [correlations, setCorrelations] = useState<any[]>([]);
  const [stats, setStats] = useState({ avg: 0, total: 0, streak: 0, best: 0, worst: 10 });
  const [weeklyData, setWeeklyData] = useState<number[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    const corr = await getCorrelationData(user.id);
    setCorrelations(corr);

    const entries = await getAllMoodEntries(user.id);
    if (entries.length > 0) {
      const avg = entries.reduce((s: number, e: any) => s + e.score, 0) / entries.length;
      const best = Math.max(...entries.map((e: any) => e.score));
      const worst = Math.min(...entries.map((e: any) => e.score));

      // Calculate streak
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < entries.length; i++) {
        const expected = new Date(today);
        expected.setDate(expected.getDate() - i);
        const expStr = expected.toISOString().split('T')[0];
        if (entries[i].date === expStr) {
          streak++;
        } else {
          break;
        }
      }

      setStats({ avg: Math.round(avg * 10) / 10, total: entries.length, streak, best, worst });

      // Build weekly data (last 7 days)
      const weekly: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const entry = entries.find((e: any) => e.date === dateStr);
        weekly.push(entry ? entry.score : 0);
      }
      setWeeklyData(weekly);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const dayLabels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  const getLast7DayLabels = () => {
    const labels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(dayLabels[d.getDay() === 0 ? 6 : d.getDay() - 1]);
    }
    return labels;
  };
  const weekLabels = getLast7DayLabels();

  // Interpretation logic
  const getInterpretation = () => {
    if (stats.total < 3) return null;
    const avg = stats.avg;
    if (avg >= 7.5) {
      return {
        quote: '"Tu bienestar emocional ha sido consistentemente alto este mes."',
        explanation: `Con un promedio de ${avg}/10 y ${stats.streak} dias de racha, estas manteniendo habitos que impactan positivamente en tu estado de animo. Las actividades que mas se correlacionan con tu bienestar son una herramienta valiosa para mantener este equilibrio.`,
      };
    } else if (avg >= 5) {
      return {
        quote: '"Hay un equilibrio en tu bienestar con espacio para crecer."',
        explanation: `Tu promedio de ${avg}/10 muestra estabilidad emocional. Observa las actividades con mayor correlacion positiva e intenta incorporarlas mas seguido. Los patrones semanales pueden revelar que dias necesitan mas atencion.`,
      };
    } else {
      return {
        quote: '"Este periodo ha sido desafiante, pero registrar es un paso importante."',
        explanation: `Con un promedio de ${avg}/10, estos datos pueden ser valiosos para compartir con tu profesional. Observa que actividades se correlacionan con mejores dias y considera priorizar esas acciones.`,
      };
    }
  };

  const interpretation = getInterpretation();

  return (
    <AppContainer>
        <Text style={[styles.title, { color: colors.text }]}>Tus Insights</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Analisis profundo de tu bienestar este mes.
        </Text>

        {/* Stat Cards - stacked vertically */}
        <View style={[styles.statCard, cardShadow]}>
          <Text style={styles.statIcon}>📊</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>PROMEDIO</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats.avg}</Text>
        </View>

        <View style={[styles.statCard, cardShadow]}>
          <Text style={styles.statIcon}>📝</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>REGISTROS</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
        </View>

        <View style={[styles.statCard, cardShadow]}>
          <Text style={styles.statIcon}>🔥</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>RACHA</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {stats.streak} {stats.streak === 1 ? 'dia' : 'dias'}
          </Text>
        </View>

        {/* Interpretation Card */}
        {interpretation && (
          <View style={[styles.interpretationCard, { backgroundColor: colors.accent }]}>
            <Text style={[styles.interpretationLabel, { color: colors.primary }]}>
              INTERPRETACION IA
            </Text>
            <Text style={[styles.interpretationQuote, { color: colors.text }]}>
              {interpretation.quote}
            </Text>
            <Text style={[styles.interpretationExplanation, { color: colors.textSecondary }]}>
              {interpretation.explanation}
            </Text>
          </View>
        )}

        {/* Correlations */}
        <View style={[styles.card, cardShadow]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Correlaciones</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Actividad vs Animo
          </Text>

          {correlations.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              Registra algunos dias con actividades para ver correlaciones
            </Text>
          ) : (
            correlations.map((c) => {
              const diff = c.avg_mood_with - c.avg_mood_overall;
              const diffStr = diff >= 0 ? `+${diff.toFixed(1)} mood` : `${diff.toFixed(1)} mood`;
              const barWidth = Math.max(10, (c.avg_mood_with / 10) * 100);

              return (
                <View key={c.id} style={styles.corrRow}>
                  <View style={styles.corrLeft}>
                    <Text style={styles.corrEmoji}>{c.emoji}</Text>
                    <Text style={[styles.corrName, { color: colors.text }]}>{c.name}</Text>
                  </View>
                  <View style={styles.corrRight}>
                    <View style={[styles.corrBarBg, { backgroundColor: colors.bg }]}>
                      <View
                        style={[
                          styles.corrBar,
                          {
                            width: `${barWidth}%`,
                            backgroundColor: moodScoreToColor(c.avg_mood_with, colors),
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.corrDiff,
                        { color: diff >= 0 ? colors.success : colors.danger },
                      ]}
                    >
                      {diffStr}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Weekly trend */}
        {weeklyData.length > 0 && (
          <View style={[styles.card, cardShadow]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Tendencia semanal</Text>
            <View style={styles.chartContainer}>
              {weeklyData.map((val, i) => {
                const barHeight = val > 0 ? (val / 10) * 120 : 4;
                return (
                  <View key={i} style={styles.chartColumn}>
                    <View style={styles.barWrapper}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: barHeight,
                            backgroundColor: val > 0
                              ? moodScoreToColor(val, colors)
                              : colors.border,
                            borderRadius: 6,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.chartLabel, { color: colors.textSecondary }]}>
                      {weekLabels[i]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Detailed interpretations */}
        {correlations.length > 0 && (
          <View style={[styles.card, cardShadow]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>¿Que significa?</Text>
            {correlations.slice(0, 3).map((c) => {
              const diff = c.avg_mood_with - c.avg_mood_overall;
              if (diff > 0.5) {
                return (
                  <Text key={c.id} style={[styles.insight, { color: colors.text }]}>
                    {c.emoji} Los dias que haces{' '}
                    <Text style={{ color: colors.success, fontFamily: 'Outfit_600SemiBold' }}>
                      {c.name}
                    </Text>{' '}
                    tu animo sube {diff.toFixed(1)} puntos vs. tu promedio.
                  </Text>
                );
              } else if (diff < -0.5) {
                return (
                  <Text key={c.id} style={[styles.insight, { color: colors.text }]}>
                    {c.emoji} Los dias con{' '}
                    <Text style={{ color: colors.danger, fontFamily: 'Outfit_600SemiBold' }}>
                      {c.name}
                    </Text>{' '}
                    tu animo baja {Math.abs(diff).toFixed(1)} puntos vs. tu promedio.
                  </Text>
                );
              }
              return null;
            })}
            <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
              * Correlacion no implica causalidad. Usa estos datos como punto de partida para reflexionar.
            </Text>
          </View>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 12,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  interpretationCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    marginTop: 4,
  },
  interpretationLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  interpretationQuote: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay_700Bold',
    lineHeight: 28,
    marginBottom: 12,
  },
  interpretationExplanation: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 22,
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
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 20,
  },
  empty: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    paddingVertical: 20,
  },
  corrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  corrLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 0.45,
  },
  corrEmoji: { fontSize: 24 },
  corrName: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  corrRight: {
    flex: 0.55,
    alignItems: 'flex-end',
    gap: 4,
  },
  corrBarBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  corrBar: { height: 8, borderRadius: 4 },
  corrDiff: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    marginTop: 16,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  bar: {
    width: 24,
  },
  chartLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    marginTop: 8,
  },
  insight: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 22,
    marginBottom: 12,
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    fontStyle: 'italic',
    marginTop: 8,
  },
});
