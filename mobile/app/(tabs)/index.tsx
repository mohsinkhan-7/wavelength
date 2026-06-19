import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GENRE_ROWS, getTrending, getUndergroundTrending, searchTracks } from '@/api/audius';
import { getJamendoLatest, getJamendoPopular } from '@/api/jamendo';
import AppBackground from '@/components/AppBackground';
import Section from '@/components/Section';
import { useAuth } from '@/store/auth';
import { usePlayer } from '@/store/player';
import { useUI } from '@/store/ui';
import { colors, font, fonts, spacing } from '@/theme';
import type { Track } from '@/types';

const PAGE = 20;

type Feed = { key: string; title: string; fetch: (offset: number) => Promise<Track[]> };

// Language / region rows — surfaced from Audius search so the free, full-length
// catalog spans many languages (independent/regional artists, remixes, covers).
const LANGUAGE_ROWS: { key: string; title: string; query: string }[] = [
  { key: 'lang-hindi', title: 'Bollywood & Hindi', query: 'bollywood' },
  { key: 'lang-punjabi', title: 'Punjabi', query: 'punjabi' },
  { key: 'lang-latin', title: 'Latin', query: 'latin' },
  { key: 'lang-arabic', title: 'Arabic', query: 'arabic' },
  { key: 'lang-kpop', title: 'K-Pop', query: 'kpop' },
  { key: 'lang-afro', title: 'Afrobeats', query: 'afrobeats' },
];

const FEEDS: Feed[] = [
  { key: 'trending', title: 'Trending', fetch: (o) => getTrending({ time: 'week', limit: PAGE, offset: o }) },
  { key: 'underground', title: 'Underground', fetch: (o) => getUndergroundTrending(PAGE, o) },
  { key: 'jamendo-popular', title: 'Popular Worldwide', fetch: (o) => getJamendoPopular(PAGE, o) },
  { key: 'jamendo-fresh', title: 'Fresh Releases', fetch: (o) => getJamendoLatest(PAGE, o) },
  ...LANGUAGE_ROWS.map((r) => ({
    key: r.key,
    title: r.title,
    fetch: (o: number) => searchTracks(r.query, PAGE, o),
  })),
  ...GENRE_ROWS.map((r) => ({
    key: r.genre,
    title: r.label,
    fetch: (o: number) => getTrending({ genre: r.genre, limit: PAGE, offset: o }),
  })),
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const playQueue = usePlayer((s) => s.playQueue);
  const openActions = useUI((s) => s.openTrackActions);

  const [feeds, setFeeds] = useState<Record<string, Track[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Per-row pagination bookkeeping (kept in a ref to dodge stale closures).
  const meta = useRef<Record<string, { loading: boolean; done: boolean; count: number }>>({});

  const loadMore = useCallback(async (feed: Feed, reset = false) => {
    const m = meta.current[feed.key] ?? { loading: false, done: false, count: 0 };
    if (!reset && (m.loading || m.done)) return;
    const offset = reset ? 0 : m.count;
    meta.current[feed.key] = { loading: true, done: false, count: reset ? 0 : m.count };
    try {
      const page = await feed.fetch(offset);
      setFeeds((prev) => {
        const base = reset ? [] : prev[feed.key] ?? [];
        const seen = new Set(base.map((t) => t.id));
        const merged = [...base, ...page.filter((t) => !seen.has(t.id))];
        meta.current[feed.key] = { loading: false, done: page.length < PAGE, count: merged.length };
        return { ...prev, [feed.key]: merged };
      });
    } catch {
      meta.current[feed.key] = { ...meta.current[feed.key], loading: false };
    }
  }, []);

  const loadInitial = useCallback(async () => {
    await Promise.allSettled(FEEDS.map((f) => loadMore(f, true)));
  }, [loadMore]);

  useEffect(() => {
    setLoading(true);
    loadInitial().finally(() => setLoading(false));
  }, [loadInitial]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitial();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <AppBackground />
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Hi, {user?.displayName?.split(' ')[0] ?? 'there'} 👋</Text>
          <Text style={styles.heading}>Listen now</Text>
        </View>
        <Pressable onPress={logout} hitSlop={10}>
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.xxl }}
      >
        {FEEDS.map((f) => (
          <Section
            key={f.key}
            title={f.title}
            tracks={feeds[f.key] ?? []}
            loading={loading}
            onPlay={playQueue}
            onMore={openActions}
            onEndReached={() => loadMore(f)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  hello: { color: colors.textMuted, fontSize: font.small },
  heading: { color: colors.text, fontSize: font.title, fontFamily: fonts.display, marginTop: 2 },
  logout: { color: colors.textMuted, fontSize: font.small },
});
