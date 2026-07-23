// Paleta cálida del rediseño del área profesional.
// Se usa junto al theme dinámico (colors.primary / colors.text / ...) para los
// estados semánticos: atención, positivo, negativo y textos apagados.

export const AMBER = '#E8A54B';
export const AMBER_BG = '#FBF1DF';
export const AMBER_INK = '#9A6A18';

export const CORAL = '#EC7C6A';
export const TEAL = '#35B79A';

export const GREY_INK = '#8B8794';
export const GREY_BADGE_BG = '#EFEDF2';

export const HAIR = '#F1EFF4';
export const FIELD = '#F7F5F3';
export const CARD = '#FFFFFF';

// Sombra suave estándar de las cards
export const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;
