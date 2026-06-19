import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { getUser, getUserTracks } from '@/api/audius';
import { getDeezerArtist, resolveDeezerPreview } from '@/api/deezer';
import { getJamendoArtist } from '@/api/jamendo';
import AppBackground from '@/components/AppBackground';
import TrackRow from '@/components/TrackRow';
import { usePlayer } from '@/store/player';
import { useUI } from '@/store/ui';
import { colors, font, gradients, radius, spacing } from '@/theme';
import type { Track } from '@/types';

export default function ArtistScreen() {
  const { id, name: nameParam } = useLocalSearchParams<{ id: string; name?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const playQueue = usePlayer((s) => s.playQueue);
  const setShuffle = usePlayer((s) => s.setShuffle);
  const openActions = useUI((s) => s.openTrackActions);

  const sep = (id ?? '').indexOf(':');
  const source = sep > 0 ? (id as string).slice(0, sep) : 'audius';
  const rawId = sep > 0 ? (id as string).slice(sep + 1) : (id as string);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [name, setName] = useState(nameParam ?? 'Artist');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        if (source === 'deezer' || source === 'jamendo') {
          const r = source === 'jamendo' ? await getJamendoArtist(rawId) : await getDeezerArtist(rawId);
          if (!alive) return;
          setTracks(r.tracks);
          if (r.name) setName(r.name);
          setAvatar(r.avatar);
        } else {
          const [t, u] = await Promise.all([getUserTracks(rawId), getUser(rawId)]);
          if (!alive) return;
          setTracks(t);
          if (u) {
            setName(u.name);
            setAvatar(u.avatar);
          }
        }
      } catch {
        /* leave empty */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const playFrom = async (list: Track[], index: number) => {
    const t = list[index];
    if (t.source === 'deezer' && !t.streamUrl) {
      const url = await resolveDeezerPreview(t);
      if (url) list = list.map((x, j) => (j === index ? { ...x, streamUrl: url } : x));
    }
    playQueue(list, index);
  };

  const initial = name.trim().charAt(0).toUpperCase() || '♪';

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
        contentContainerStyle={{ paddingBottom: spacing.xxl * 3 }}
        ListHeaderComponent={
          <View style={styles.header}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={gradients.brand} style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </LinearGradient>
            )}
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.meta}>
              {source === 'deezer' ? 'Deezer · previews' : source === 'jamendo' ? 'Jamendo' : 'Audius'} ·{' '}
              {tracks.length} tracks
            </Text>
            {tracks.length > 0 && (
              <View style={styles.actions}>
                <Pressable style={styles.playBtn} onPress={() => playFrom(tracks, 0)}>
                  <LinearGradient
                    colors={gradients.brand}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.playBtnText}>▶  Play</Text>
                </Pressable>
                <Pressable
                  style={styles.shuffleBtn}
                  onPress={() => {
                    setShuffle(true);
                    void playFrom(tracks, 0);
                  }}
                >
                  <Text style={styles.shuffleText}>⤮  Shuffle</Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <TrackRow track={item} onPress={() => playFrom(tracks, index)} onMore={() => openActions(item)} />
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
          ) : (
            <Text style={styles.empty}>No tracks found for this artist.</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  topBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  back: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  header: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { color: colors.white, fontSize: 48, fontWeight: '800' },
  name: { color: colors.text, fontSize: font.title, fontWeight: '800', textAlign: 'center' },
  meta: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.xs },
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
  shuffleText: { color: colors.text, fontWeight: '700', fontSize: font.body },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl, fontSize: font.body },
});
