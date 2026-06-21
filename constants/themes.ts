export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
}

export interface Personality {
  id: string;
  name: string;
  emoji: string;
  description: string;
  colors: ThemeColors;
}

export const personalities: Personality[] = [
  {
    id: 'calm',
    name: 'Calma',
    emoji: '🌊',
    description: 'Sereno & Lavanda',
    colors: {
      primary: '#6C5CE7',
      secondary: '#a29bfe',
      accent: '#e4dfff',
      bg: '#F8F7FF',
      card: '#FFFFFF',
      text: '#1c1b1b',
      textSecondary: '#474554',
      border: '#c8c4d7',
      success: '#27AE60',
      warning: '#F1C40F',
      danger: '#E74C3C',
    },
  },
  {
    id: 'energy',
    name: 'Energia',
    emoji: '⚡',
    description: 'Vibrante & Cálido',
    colors: {
      primary: '#FF9F43',
      secondary: '#ffc877',
      accent: '#ffe0b2',
      bg: '#FFF9F2',
      card: '#FFFFFF',
      text: '#1c1b1b',
      textSecondary: '#474554',
      border: '#f0e0cc',
      success: '#27AE60',
      warning: '#F1C40F',
      danger: '#E74C3C',
    },
  },
  {
    id: 'nature',
    name: 'Naturaleza',
    emoji: '🌿',
    description: 'Orgánico & Tierra',
    colors: {
      primary: '#10AC84',
      secondary: '#55efc4',
      accent: '#c8f7e8',
      bg: '#F4FAF8',
      card: '#FFFFFF',
      text: '#1c1b1b',
      textSecondary: '#474554',
      border: '#c4e0d6',
      success: '#27AE60',
      warning: '#F1C40F',
      danger: '#E74C3C',
    },
  },
  {
    id: 'sunset',
    name: 'Atardecer',
    emoji: '🌅',
    description: 'Suave & Rosáceo',
    colors: {
      primary: '#FF78B0',
      secondary: '#fd79a8',
      accent: '#ffe0ec',
      bg: '#FFF5F8',
      card: '#FFFFFF',
      text: '#1c1b1b',
      textSecondary: '#474554',
      border: '#f0c4d4',
      success: '#27AE60',
      warning: '#F1C40F',
      danger: '#E74C3C',
    },
  },
  {
    id: 'ocean',
    name: 'Oceano',
    emoji: '🐬',
    description: 'Profundo & Fresco',
    colors: {
      primary: '#00D2D3',
      secondary: '#48dbfb',
      accent: '#c8f8f8',
      bg: '#F2FCFC',
      card: '#FFFFFF',
      text: '#1c1b1b',
      textSecondary: '#474554',
      border: '#b8e8e8',
      success: '#27AE60',
      warning: '#F1C40F',
      danger: '#E74C3C',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    emoji: '⬜',
    description: 'Puro & Esencial',
    colors: {
      primary: '#2D3436',
      secondary: '#636e72',
      accent: '#b2bec3',
      bg: '#F9F9F9',
      card: '#FFFFFF',
      text: '#1c1b1b',
      textSecondary: '#636e72',
      border: '#dfe6e9',
      success: '#27AE60',
      warning: '#F1C40F',
      danger: '#E74C3C',
    },
  },
];

export function getPersonalityById(id: string): Personality {
  return personalities.find((p) => p.id === id) || personalities[0];
}

export function moodScoreToColor(score: number, _theme?: ThemeColors): string {
  if (score <= 2) return '#E74C3C';
  if (score <= 4) return '#F39C12';
  if (score <= 6) return '#95A5A6';
  if (score <= 8) return '#6C5CE7';
  return '#27AE60';
}

export function moodScoreToEmoji(score: number): string {
  if (score <= 2) return '😢';
  if (score <= 4) return '😔';
  if (score <= 5) return '😐';
  if (score <= 7) return '🙂';
  if (score <= 9) return '😊';
  return '🤩';
}

export const moodGradientColors = [
  '#E74C3C', '#E67E22', '#F39C12', '#F1C40F', '#95A5A6',
  '#95A5A6', '#6C9FE7', '#6C5CE7', '#2ECC71', '#27AE60',
];
