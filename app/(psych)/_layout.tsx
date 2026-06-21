import { Stack } from 'expo-router';
import { useTheme } from '../../lib/theme-context';

export default function PsychLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
