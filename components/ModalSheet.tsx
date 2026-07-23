import React from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';
import { GREY_INK } from '../constants/palette';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Alto de la hoja como fracción de la pantalla (0-1). Default 0.9 */
  heightRatio?: number;
  /** Si es false, los children se renderizan sin ScrollView ni header (para estados de éxito). */
  scroll?: boolean;
  children: React.ReactNode;
}

/**
 * Hoja inferior compartida por los modales del área profesional.
 * Unifica backdrop, handle, botón de cerrar y el header (título serif + subtítulo).
 */
export default function ModalSheet({
  visible, onClose, title, subtitle, heightRatio = 0.9, scroll = true, children,
}: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { height: SCREEN_HEIGHT * heightRatio }]}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={GREY_INK} />
            </TouchableOpacity>
          </View>

          {scroll ? (
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {title ? <Text style={[styles.title, !subtitle && { marginBottom: 18 }, { color: colors.text }]}>{title}</Text> : null}
              {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
              {children}
            </ScrollView>
          ) : (
            <View style={styles.plain}>{children}</View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30,26,45,0.45)', justifyContent: 'flex-end', alignItems: 'center' },
  backdropTouch: { flex: 1, alignSelf: 'stretch' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 560,
  },
  handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 8, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DEDAE6' },
  closeBtn: { position: 'absolute', right: 20, top: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F1F6', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingBottom: 40 },
  plain: { flex: 1 },
  title: { fontSize: 24, fontFamily: 'PlayfairDisplay_700Bold', letterSpacing: -0.3 },
  subtitle: { fontSize: 14, fontFamily: 'Outfit_400Regular', lineHeight: 20, marginTop: 5, marginBottom: 18 },
});
