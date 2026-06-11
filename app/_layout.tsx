import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, useTheme } from '@/theme';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}

function RootNavigator() {
  const theme = useTheme();

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.textPrimary,
          headerTitleStyle: { color: theme.colors.textPrimary },
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
    </>
  );
}
