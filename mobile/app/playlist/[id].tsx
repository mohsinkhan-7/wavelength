import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveDeezerPreview } from '@/api/deezer';
import AppBackground from '@/components/AppBackground';
import TrackRow from '@/components/TrackRow';
import { useLibrary } from '@/store/library';
import { usePlayer } from '@/store/player';
import { useUI } from '@/store/ui';
import { colors, font, gradients, radius, spacing } from '@/theme';
import type { Track } from '@/types';

export default function PlaylistDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const liked = useLibrary((s) => s.liked);
  const downloads = useLibrary((s) => s.downloads);
  const playlists = useLibrary((s) => s.playlists);
  const removeFromPlaylist = useLibrary((s) => s.removeFromPlaylist);

  const playQueue = usePlayer((s) => s.playQueue);
  const setShuffle = usePlayer((s) => s.setShuffle);
  const openActions = useUI((s) => s.openTrackActions);

  const { title, tracks, removable } = useMemo<{
    title: string;
    tracks: Track[];
    removable: boolean;
  }>(() => {
    if (id === 'liked') return { title: 'Liked Songs', tracks: liked, removable: false };
    if (id === 'downloads') return { title: 'Downloads', tracks: downloads, removable: false };
    const pl = playlists.find((p) => p._id === id);
    return { title: pl?.name ?? 'Playlist', tracks: pl?.tracks ?? [], removable: !!pl };
  }, [id, liked, downloads, playlists]);

  // Saved Deezer tracks have no streamUrl (preview tokens expire) — re-fetch a
  // fresh preview for the tapped track before queuing it.
  const playFrom = async (list: Track[], index: number) => {
    const t = list[index];
    if (t.source === 'deezer' && !t.streamUrl) {
      const url = await resolveDeezerPreview(t);
      if (url) list = list.map((x, j) => (j === index ? { ...x, streamUrl: url } : x));
    }
    playQueue(list, index);
  };

  const playAll = (shuffle: boolean) => {
    if (!tracks.length) return;
    setShuffle(shuffle);
    void playFrom(tracks, 0);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <AppBackground />
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>

      <FlatList
        data={tracks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        ListHeaderComponent={
          <View style={styles.head}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.count}>
              {tracks.length} song{tracks.length === 1 ? '' : 's'}
            </Text>
            {tracks.length > 0 && (
              <View style={styles.actions}>
                <Pressable style={styles.playBtn} onPress={() => playAll(false)}>
                  <LinearGradient
                    colors={gradients.brand}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.playBtnText}>▶  Play</Text>
                </Pressable>
                <Pressable style={styles.shuffleBtn} onPress={() => playAll(true)}>
                  <Text style={styles.shuffleBtnText}>⤮  Shuffle</Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {id === 'downloads'
              ? 'No downloads yet. Tap ⋯ on any track to save it offline.'
              : id === 'liked'
                ? 'Songs you like will show up here.'
                : 'This playlist is empty. Add songs with the ⋯ menu.'}
          </Text>
        }
        renderItem={({ item, index }) => (
          <TrackRow
            track={item}
            onPress={() => playFrom(tracks, index)}
            onMore={
              removable && typeof id === 'string'
                ? () => removeFromPlaylist(id, item.id)
                : () => openActions(item)
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  topBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  back: { color: colors.primary, fontSize: font.body, fontWeight: '600' },
  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { color: colors.text, fontSize: font.title, fontWeight: '800' },
  count: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  playBtn: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    height: 46,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playBtnText: { color: colors.white, fontWeight: '800', fontSize: font.body },
  shuffleBtn: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    height: 46,
    justifyContent: 'center',
  },
  shuffleBtnText: { color: colors.text, fontWeight: '700', fontSize: font.body },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    fontSize: font.body,
    lineHeight: 22,
  },
});
