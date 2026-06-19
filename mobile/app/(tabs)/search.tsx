import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { searchTracks } from '@/api/audius';
import { searchJamendo } from '@/api/jamendo';
import AppBackground from '@/components/AppBackground';
import TrackRow from '@/components/TrackRow';
import { usePlayer } from '@/store/player';
import { useUI } from '@/store/ui';
import { colors, font, fonts, radius, spacing } from '@/theme';
import type { Track } from '@/types';

export default function Search() {
  const insets = useSafeAreaInsets();
  const playQueue = usePlayer((s) => s.playQueue);
  const openActions = useUI((s) => s.openTrackActions);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      // Both sources are full tracks, so merge into one list (Audius first).
      const [a, j] = await Promise.allSettled([searchTracks(query, 40), searchJamendo(query, 25)]);
      const audius = a.status === 'fulfilled' ? a.value : [];
      const jamendo = j.status === 'fulfilled' ? j.value : [];
      setResults([...audius, ...jamendo]);
      setSearched(true);
      setLoading(false);
    }, 400);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <AppBackground />
      <Text style={styles.heading}>Search</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
        <TextInput
          placeholder="Songs, artists, anything…"
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={setQuery}
          style={styles.input}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : searched && results.length === 0 ? (
        <Text style={styles.empty}>No results for “{query}”.</Text>
      ) : !searched ? (
        <Text style={styles.hint}>Search the worldwide catalog — full tracks across every language.</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(t) => t.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          renderItem={({ item, index }) => (
            <TrackRow track={item} onPress={() => playQueue(results, index)} onMore={() => openActions(item)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  heading: {
    color: colors.text,
    fontSize: font.heading,
    fontFamily: fonts.display,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.glass,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchIcon: { color: colors.textMuted, fontSize: 20, marginRight: spacing.sm },
  input: { flex: 1, height: 48, color: colors.text, fontSize: font.body },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl, fontSize: font.body },
  hint: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxl,
    fontSize: font.body,
    paddingHorizontal: spacing.xl,
    lineHeight: 22,
  },
});
