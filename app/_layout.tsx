import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { CityProvider } from '@/features/cities';
import { createQueryClient } from '@/lib/queryClient';
import { ThemeProvider, useTheme } from '@/theme';

// Module scope: one client for the app's lifetime (survives re-renders).
const queryClient = createQueryClient();

export default function RootLayout() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <CityProvider>
          <RootNavigator />
        </CityProvider>
      </QueryClientProvider>
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
