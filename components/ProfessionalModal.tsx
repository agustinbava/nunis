import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';
import ModalSheet from './ModalSheet';
import { AMBER, TEAL, GREY_INK, HAIR } from '../constants/palette';

interface Props {
  professional: any | null;
  visible: boolean;
  onClose: () => void;
}

export default function ProfessionalModal({ professional, visible, onClose }: Props) {
  const { colors } = useTheme();
  if (!professional) return null;
  const p = professional;
  const initials = p.name?.replace('Lic. ', '').split(' ').map((w: string) => w[0]).slice(0, 2).join('');

  return (
    <ModalSheet visible={visible} onClose={onClose} heightRatio={0.82}>
      <View style={styles.center}>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{p.name}</Text>
        <Text style={[styles.specialty, { color: colors.primary }]}>{p.specialty}</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={15} color={AMBER} />
              <Text style={[styles.statValue, { color: colors.text }]}>{p.rating}</Text>
            </View>
            <Text style={styles.statLabel}>{p.reviews} reseñas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: p.accepting ? TEAL : GREY_INK }]}>
              {p.accepting ? 'Disponible' : 'Sin cupos'}
            </Text>
            <Text style={styles.statLabel}>agenda</Text>
          </View>
        </View>

        {p.focus ? (
          <View style={[styles.chip, { backgroundColor: colors.accent }]}>
            <Text style={[styles.chipText, { color: colors.primary }]}>{p.focus}</Text>
          </View>
        ) : null}

        {p.bio ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Sobre mí</Text>
            <Text style={[styles.bio, { color: colors.textSecondary }]}>{p.bio}</Text>
          </>
        ) : null}

        <Text style={[styles.sectionLabel, { color: colors.text }]}>Detalles</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailKey}>Modalidad</Text>
          <Text style={[styles.detailVal, { color: colors.text }]}>{p.modality || '-'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailKey}>Valor</Text>
          <Text style={[styles.detailVal, { color: colors.text }]}>{p.price || '-'}</Text>
        </View>

        <TouchableOpacity
          style={[styles.cta, { backgroundColor: p.accepting ? colors.primary : '#D6D1E2' }]}
          activeOpacity={0.85}
          disabled={!p.accepting}
        >
          <Text style={styles.ctaText}>{p.accepting ? 'Solicitar una sesión' : 'Sin cupos por ahora'}</Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          Nunis te conecta con el profesional. La coordinación y el pago se acuerdan directamente.
        </Text>
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  avatar: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  avatarText: { fontSize: 28, fontFamily: 'PlayfairDisplay_700Bold' },
  name: { fontSize: 24, fontFamily: 'PlayfairDisplay_700Bold', textAlign: 'center', letterSpacing: -0.3 },
  specialty: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', textAlign: 'center', marginTop: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 8 },
  stat: { alignItems: 'center', paddingHorizontal: 24 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statDivider: { width: 1, height: 32, backgroundColor: HAIR },
  statValue: { fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
  statLabel: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: GREY_INK, marginTop: 3 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9999, marginTop: 14 },
  chipText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  sectionLabel: { fontSize: 17, fontFamily: 'PlayfairDisplay_700Bold', alignSelf: 'flex-start', marginTop: 24, marginBottom: 8 },
  bio: { fontSize: 14, fontFamily: 'Outfit_400Regular', lineHeight: 22, alignSelf: 'flex-start' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: HAIR },
  detailKey: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: GREY_INK },
  detailVal: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', flex: 1, textAlign: 'right' },
  cta: { alignSelf: 'stretch', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 28 },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
  disclaimer: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: GREY_INK, textAlign: 'center', marginTop: 14, lineHeight: 18 },
});
