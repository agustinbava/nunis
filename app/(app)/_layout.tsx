import { Tabs } from 'expo-router';
import { useTheme } from '../../lib/theme-context';
import { View, Text, useWindowDimensions, Platform } from 'react-native';
import { useEffect } from 'react';

function useTabBarHoverEffect() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const style = document.createElement('style');
    style.textContent = `
      [role="tab"] {
        transition: all 0.25s ease !important;
        border-radius: 9999px !important;
      }
      [role="tab"]:hover {
        background-color: rgba(255,255,255,0.1) !important;
      }
      [role="tab"]:hover [role="tab"] span,
      [role="tab"]:hover div {
        color: #ffffff !important;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);
}

export default function AppLayout() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const tabBarWidth = Math.min(400, width - 48);

  useTabBarHoverEffect();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarIconStyle: { display: 'none' },
        tabBarStyle: {
          backgroundColor: '#1c1b1b',
          borderTopWidth: 0,
          borderRadius: 9999,
          width: tabBarWidth,
          alignSelf: 'center',
          marginBottom: 20,
          marginLeft: (width - tabBarWidth) / 2,
          position: 'absolute',
          height: 52,
          paddingBottom: 0,
          paddingTop: 0,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
        tabBarLabelStyle: {
          fontSize: 13,
          fontFamily: 'Outfit_500Medium',
          fontWeight: '500',
          marginTop: 0,
          paddingTop: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 14,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoy' }} />
      <Tabs.Screen name="history" options={{ title: 'Historial' }} />
      <Tabs.Screen name="journal" options={{ title: 'Journal' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
