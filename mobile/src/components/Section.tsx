import { FlatList, StyleSheet, Text, View } from 'react-native';
import Artwork from './Artwork';
import PressableScale from './PressableScale';
import { colors, font, fonts, radius, spacing } from '@/theme';
import type { Track } from '@/types';

type Props = {
  title: string;
  badge?: string; // e.g. 'DEEZER' | 'AUDIUS'
  badgeTint?: string;
  tracks: Track[];
  loading?: boolean;
  onPlay: (tracks: Track[], index: number) => void;
  onMore?: (track: Track) => void;
  onEndReached?: () => void; // load the next page of this row
};

// A horizontal carousel of track cards for the Home screen.
export default function Section({
  title,
  badge,
  badgeTint = colors.primary,
  tracks,
  loading,
  onPlay,
  onMore,
  onEndReached,
}: Props) {
  if (!loading && !tracks.length) return null;
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        {badge && (
          <View style={[styles.badge, { borderColor: badgeTint }]}>
            <Text style={[styles.badgeText, { color: badgeTint }]}>{badge}</Text>
          </View>
        )}
      </View>
      {loading && !tracks.length ? (
        <View style={styles.skeletonRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeleton} />
          ))}
        </View>
      ) : (
        <FlatList
          horizontal
          data={tracks}
          keyExtractor={(t) => t.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          renderItem={({ item, index }) => (
            <PressableScale style={styles.card} onPress={() => onPlay(tracks, index)} onLongPress={() => onMore?.(item)}>
              <View>
                <Artwork uri={item.artwork} size={138} />
                {item.previewOnly && (
                  <View style={styles.previewTag}>
                    <Text style={styles.previewTagText}>PREVIEW</Text>
                  </View>
                )}
              </View>
              <Text numberOfLines={1} style={styles.cardTitle}>
                {item.title}
              </Text>
              <Text numberOfLines={1} style={styles.cardArtist}>
                {item.artist}
              </Text>
            </PressableScale>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.xl },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: font.heading, fontFamily: fonts.display },
  badge: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: font.tiny, fontWeight: '800', letterSpacing: 0.5 },
  row: { paddingHorizontal: spacing.lg, gap: spacing.md },
  card: { width: 138 },
  cardTitle: { color: colors.text, fontSize: font.small, fontWeight: '600', marginTop: spacing.xs },
  cardArtist: { color: colors.textMuted, fontSize: font.tiny, marginTop: 1 },
  previewTag: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  previewTagText: { color: colors.accent, fontSize: font.tiny, fontWeight: '800', letterSpacing: 0.5 },
  skeletonRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg },
  skeleton: { width: 138, height: 138, borderRadius: radius.lg, backgroundColor: colors.glass },
});
