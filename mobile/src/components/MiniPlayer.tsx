import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Artwork from './Artwork';
import Equalizer from './Equalizer';
import Glass from './Glass';
import { tapMedium } from '@/lib/haptics';
import { colors, font, gradients, radius, spacing } from '@/theme';
import { usePlayer } from '@/store/player';

export default function MiniPlayer() {
  const router = useRouter();
  const track = usePlayer((s) => s.queue[s.index] ?? null);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const toggle = usePlayer((s) => s.toggle);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);

  if (!track) return null;
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <View style={styles.outer}>
      <Glass radius={radius.lg} intensity={60} strong sheen style={styles.glass}>
        <Pressable style={styles.body} onPress={() => router.push('/player')}>
          <Artwork uri={track.artwork} size={42} />
          <View style={styles.meta}>
            <View style={styles.titleRow}>
              {isPlaying && <Equalizer size={11} color={colors.primary} />}
              <Text numberOfLines={1} style={[styles.title, { flexShrink: 1 }]}>
                {track.title}
              </Text>
            </View>
            <Text numberOfLines={1} style={styles.artist}>
              {track.artist}
            </Text>
          </View>
          <Pressable
            hitSlop={12}
            onPress={(e) => {
              e.stopPropagation?.();
              tapMedium();
              toggle();
            }}
            style={styles.playBtn}
          >
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color={colors.white} />
          </Pressable>
        </Pressable>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: spacing.sm, paddingBottom: spacing.xs },
  glass: {},
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  meta: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  artist: { color: colors.textMuted, fontSize: font.tiny, marginTop: 1 },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playIcon: { color: colors.white, fontSize: 14, fontWeight: '900' },
  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.10)' },
  progressFill: { height: 3, backgroundColor: colors.primary },
});
