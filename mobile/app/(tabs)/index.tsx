import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GENRE_ROWS, getTrending, getUndergroundTrending, getUserTracks, searchTracks } from '@/api/audius';
import { getJamendoLatest, getJamendoPopular, getJamendoTracks } from '@/api/jamendo';
import { getJioSaavnTrending } from '@/api/jiosaavn';
import { getArchiveBollywood } from '@/api/archive';
import AppBackground from '@/components/AppBackground';
import Section from '@/components/Section';
import { useAuth } from '@/store/auth';
import { useLibrary } from '@/store/library';
import { usePlayer } from '@/store/player';
import { useUI } from '@/store/ui';
import { colors, font, fonts, spacing } from '@/theme';
import type { Track } from '@/types';

const PAGE = 20;

type Feed = { key: string; title: string; fetch: (offset: number) => Promise<Track[]> };

const LANGUAGE_ROWS: { key: string; title: string; query: string }[] = [
  { key: 'lang-hindi', title: 'Bollywood & Hindi', query: 'bollywood' },
  { key: 'lang-punjabi', title: 'Punjabi', query: 'punjabi' },
  { key: 'lang-latin', title: 'Latin', query: 'latin' },
  { key: 'lang-arabic', title: 'Arabic', query: 'arabic' },
  { key: 'lang-kpop', title: 'K-Pop', query: 'kpop' },
  { key: 'lang-afro', title: 'Afrobeats', query: 'afrobeats' },
];

const JAMENDO_GENRE_ROWS: { key: string; title: string; tag: string }[] = [
  { key: 'jam-chillout', title: 'Chillout', tag: 'chillout' },
  { key: 'jam-electronic', title: 'Electronic', tag: 'electronic' },
  { key: 'jam-classical', title: 'Classical', tag: 'classical' },
  { key: 'jam-jazz', title: 'Jazz', tag: 'jazz' },
  { key: 'jam-rock', title: 'Rock', tag: 'rock' },
  { key: 'jam-hiphop', title: 'Hip-Hop', tag: 'hiphop' },
  { key: 'jam-ambient', title: 'Ambient', tag: 'ambient' },
  { key: 'jam-acoustic', title: 'Acoustic', tag: 'acoustic' },
];

const FEEDS: Feed[] = [
  { key: 'trending', title: 'Trending', fetch: (o) => getTrending({ time: 'week', limit: PAGE, offset: o }) },
  { key: 'jiosaavn-trending', title: 'Bollywood Hits', fetch: (o) => getJioSaavnTrending(PAGE, Math.floor(o / PAGE) + 1) },
  { key: 'archive-bollywood', title: 'Classic Bollywood', fetch: (o) => getArchiveBollywood(PAGE, o) },
  { key: 'underground', title: 'Underground', fetch: (o) => getUndergroundTrending(PAGE, o) },
  { key: 'jamendo-popular', title: 'Popular Worldwide', fetch: (o) => getJamendoPopular(PAGE, o) },
  { key: 'jamendo-fresh', title: 'Fresh Releases', fetch: (o) => getJamendoLatest(PAGE, o) },
  ...JAMENDO_GENRE_ROWS.map((r) => ({
    key: r.key,
    title: r.title,
    fetch: (o: number) => getJamendoTracks({ tags: r.tag, order: 'popularity_month', limit: PAGE, offset: o }),
  })),
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

  const history = useLibrary((s) => s.history);
  const liked = useLibrary((s) => s.liked);
  const followedArtists = useLibrary((s) => s.followedArtists);

  const [feeds, setFeeds] = useState<Record<string, Track[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dynamic sections loaded independently
  const [forYouTracks, setForYouTracks] = useState<Track[]>([]);
  const [followFeedTracks, setFollowFeedTracks] = useState<Track[]>([]);
  const [dynamicLoading, setDynamicLoading] = useState(false);

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

  // Load dynamic sections: For You + Artist Follow feed
  const loadDynamic = useCallback(async () => {
    setDynamicLoading(true);
    try {
      // For You: search by the user's top 2 liked artists
      const likedIds = new Set(liked.map((t) => t.id));
      const topArtists = [...new Map(liked.map((t) => [t.artist, t])).values()].slice(0, 2);
      const forYouResults = await Promise.allSettled(
        topArtists.map((t) => searchTracks(t.artist, 12, 0))
      );
      const forYou = forYouResults
        .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
        .filter((t) => !likedIds.has(t.id));
      const deduped = [...new Map(forYou.map((t) => [t.id, t])).values()].slice(0, 30);
      setForYouTracks(deduped);

      // From Artists You Follow: fetch tracks for each followed Audius artist
      const audiusFollows = followedArtists.filter((a) => a.source === 'audius').slice(0, 4);
      const followResults = await Promise.allSettled(
        audiusFollows.map((a) => getUserTracks(a.artistId, 'date', 8, 0))
      );
      const followTracks = followResults
        .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
        .filter((t) => !likedIds.has(t.id));
      const followDeduped = [...new Map(followTracks.map((t) => [t.id, t])).values()].slice(0, 30);
      setFollowFeedTracks(followDeduped);
    } catch {
      /* ignore — optional sections */
    } finally {
      setDynamicLoading(false);
    }
  }, [liked, followedArtists]);

  useEffect(() => {
    if (liked.length > 0 || followedArtists.length > 0) {
      loadDynamic();
    }
  }, []); // load once on mount; user can pull-to-refresh for updates

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([loadInitial(), loadDynamic()]);
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
        {/* Recently Played — from local history, shown immediately */}
        {history.length > 0 && (
          <Section
            title="Recently Played"
            tracks={history.slice(0, 20)}
            loading={false}
            onPlay={playQueue}
            onMore={openActions}
          />
        )}

        {/* For You — personalised from liked artists */}
        {forYouTracks.length > 0 && (
          <Section
            title="For You"
            tracks={forYouTracks}
            loading={dynamicLoading && forYouTracks.length === 0}
            onPlay={playQueue}
            onMore={openActions}
          />
        )}

        {/* New from Artists You Follow */}
        {followFeedTracks.length > 0 && (
          <Section
            title="From Artists You Follow"
            tracks={followFeedTracks}
            loading={dynamicLoading && followFeedTracks.length === 0}
            onPlay={playQueue}
            onMore={openActions}
          />
        )}

        {/* Static catalog feeds */}
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
