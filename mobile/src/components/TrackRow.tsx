import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Artwork from './Artwork';
import Equalizer from './Equalizer';
import { tapLight } from '@/lib/haptics';
import { colors, font, radius, spacing } from '@/theme';
import { useLibrary } from '@/store/library';
import { usePlayer } from '@/store/player';
import type { Track } from '@/types';

type Props = {
  track: Track;
  onPress: () => void;
  onMore?: () => void;
};

export default function TrackRow({ track, onPress, onMore }: Props) {
  const isLiked = useLibrary((s) => s.isLiked(track.id));
  const isDownloaded = useLibrary((s) => s.isDownloaded(track.id));
  const toggleLike = useLibrary((s) => s.toggleLike);
  const currentId = usePlayer((s) => s.queue[s.index]?.id);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const isCurrent = currentId === track.id;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        isCurrent && styles.rowActive,
        pressed && { opacity: 0.7 },
      ]}
      onPress={onPress}
    >
      <View>
        <Artwork uri={track.artwork} size={52} />
        {isCurrent && (
          <View style={styles.nowBadge}>
            {isPlaying ? (
              <Equalizer size={16} color={colors.white} playing />
            ) : (
              <Ionicons name="pause" size={18} color={colors.white} />
            )}
          </View>
        )}
      </View>
      <View style={styles.meta}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={[styles.title, isCurrent && styles.titleActive, { flexShrink: 1 }]}>
            {track.title}
          </Text>
          {track.previewOnly && (
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>PREVIEW</Text>
            </View>
          )}
        </View>
        <Text numberOfLines={1} style={styles.artist}>
          {isDownloaded ? '⬇ ' : ''}
          {track.artist}
        </Text>
      </View>
      <Pressable
        hitSlop={10}
        onPress={() => {
          tapLight();
          toggleLike(track);
        }}
        style={styles.iconBtn}
      >
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={20}
          color={isLiked ? colors.like : colors.textMuted}
        />
      </Pressable>
      {onMore && (
        <Pressable hitSlop={10} onPress={onMore} style={styles.iconBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  rowActive: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
  },
  nowBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowBadgeText: { color: colors.white, fontSize: 16, fontWeight: '900' },
  meta: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  titleActive: { color: colors.primary },
  previewBadge: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  previewBadgeText: { color: colors.accent, fontSize: font.tiny, fontWeight: '800', letterSpacing: 0.5 },
  artist: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  iconBtn: { padding: spacing.xs },
});
