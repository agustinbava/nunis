import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../lib/theme-context';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface Props {
  professional: any | null;
  visible: boolean;
  onClose: () => void;
}

export default function ProfessionalModal({ professional, visible, onClose }: Props) {
  const { colors } = useTheme();
  if (!professional) return null;
  const p = professional;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { height: SCREEN_HEIGHT * 0.82 }]}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>X</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {p.name?.replace('Lic. ', '').split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
              </Text>
            </View>
            <Text style={[styles.name, { color: colors.text }]}>{p.name}</Text>
            <Text style={[styles.specialty, { color: colors.primary }]}>{p.specialty}</Text>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.text }]}>{'⭐'} {p.rating}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{p.reviews} reseñas</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: p.accepting ? colors.success : colors.textSecondary }]}>
                  {p.accepting ? 'Disponible' : 'Sin cupos'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>agenda</Text>
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
              <Text style={[styles.detailKey, { color: colors.textSecondary }]}>Modalidad</Text>
              <Text style={[styles.detailVal, { color: colors.text }]}>{p.modality || '-'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: colors.textSecondary }]}>Valor</Text>
              <Text style={[styles.detailVal, { color: colors.text }]}>{p.price || '-'}</Text>
            </View>

            <TouchableOpacity
              style={[styles.cta, { backgroundColor: p.accepting ? colors.primary : '#C8C4D7' }]}
              activeOpacity={0.85}
              disabled={!p.accepting}
            >
              <Text style={styles.ctaText}>
                {p.accepting ? 'Solicitar una sesión' : 'Sin cupos por ahora'}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
              Nunis te conecta con el profesional. La coordinación y el pago se acuerdan directamente.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  backdropTouch: { flex: 1 },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 8, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D1D6' },
  closeBtn: { position: 'absolute', right: 20, top: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: '#F0EDED', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: '#787586' },
  content: { padding: 24, paddingBottom: 40, alignItems: 'center' },
  avatar: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  avatarText: { fontSize: 28, fontFamily: 'PlayfairDisplay_700Bold' },
  name: { fontSize: 24, fontFamily: 'PlayfairDisplay_700Bold', textAlign: 'center' },
  specialty: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', textAlign: 'center', marginTop: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 8 },
  stat: { alignItems: 'center', paddingHorizontal: 24 },
  statDivider: { width: 1, height: 32, backgroundColor: '#EEE' },
  statValue: { fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
  statLabel: { fontSize: 12, fontFamily: 'Outfit_400Regular', marginTop: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9999, marginTop: 14 },
  chipText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  sectionLabel: { fontSize: 16, fontFamily: 'PlayfairDisplay_700Bold', alignSelf: 'flex-start', marginTop: 24, marginBottom: 8 },
  bio: { fontSize: 14, fontFamily: 'Outfit_400Regular', lineHeight: 22, alignSelf: 'flex-start' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F2F0F7' },
  detailKey: { fontSize: 14, fontFamily: 'Outfit_400Regular' },
  detailVal: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', flex: 1, textAlign: 'right' },
  cta: { alignSelf: 'stretch', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 28 },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
  disclaimer: { fontSize: 12, fontFamily: 'Outfit_400Regular', textAlign: 'center', marginTop: 14, lineHeight: 18 },
});
