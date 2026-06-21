import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './auth-context';
import { ThemeColors, getPersonalityById } from '../constants/themes';

interface ThemeContextType {
  colors: ThemeColors;
  personality: string;
}

const defaultColors: ThemeColors = {
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
};

const ThemeContext = createContext<ThemeContextType>({
  colors: defaultColors,
  personality: 'calm',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const value = useMemo(() => {
    if (!user) return { colors: defaultColors, personality: 'calm' };
    const p = getPersonalityById(user.personality || 'calm');
    return {
      colors: {
        ...p.colors,
        primary: user.theme_primary || p.colors.primary,
        secondary: user.theme_secondary || p.colors.secondary,
        accent: user.theme_accent || p.colors.accent,
        bg: user.theme_bg || p.colors.bg,
        card: user.theme_card || p.colors.card,
        text: user.theme_text || p.colors.text,
        textSecondary: p.colors.textSecondary,
        border: p.colors.border,
        success: p.colors.success,
        warning: p.colors.warning,
        danger: p.colors.danger,
      },
      personality: user.personality || 'calm',
    };
  }, [user]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
