import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import AppBackground from '@/components/AppBackground';
import { patchTextFonts } from '@/lib/textFont';
import AudioController from '@/components/AudioController';
import TrackActionsSheet from '@/components/TrackActionsSheet';
import { searchTracks } from '@/api/audius';
import { useAuth } from '@/store/auth';
import { useLibrary } from '@/store/library';
import { registerRadioFetcher } from '@/store/player';
import { colors } from '@/theme';

// Route all <Text> through Inter (weight-aware) once, before any render.
patchTextFonts();

export default function RootLayout() {
  // Import the specific .ttf files directly — the package root index.js requires
  // every weight, and some .ttf files are missing from this install.
  const [fontsLoaded] = useFonts({
    Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
    SpaceGrotesk_600SemiBold: require('@expo-google-fonts/space-grotesk/600SemiBold/SpaceGrotesk_600SemiBold.ttf'),
    SpaceGrotesk_700Bold: require('@expo-google-fonts/space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf'),
  });
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);
  const restore = useAuth((s) => s.restore);
  const hydrate = useLibrary((s) => s.hydrate);
  const clearLibrary = useLibrary((s) => s.clear);

  const segments = useSegments();
  const router = useRouter();

  // Register the radio fetcher once. Searches Audius by artist name to auto-extend the queue.
  useEffect(() => {
    registerRadioFetcher(async (track) => {
      try {
        const results = await searchTracks(track.artist, 20, 0);
        return results.filter((t) => t.id !== track.id);
      } catch {
        return [];
      }
    });
  }, []);

  // Restore saved session on launch.
  useEffect(() => {
    restore();
  }, [restore]);

  // Keep the library in sync with the logged-in user.
  useEffect(() => {
    if (user) hydrate(user);
    else clearLibrary();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Route guard: bounce between auth flow and app based on session.
  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [token, loading, segments]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <AppBackground />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {/* Shared ambient gradient backdrop behind all (transparent) screens. */}
        <AppBackground />
        {/* Single audio engine instance — persists across all screens. */}
        <AudioController />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="player" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="playlist/[id]" />
        </Stack>
        <TrackActionsSheet />
      </View>
    </SafeAreaProvider>
  );
}
