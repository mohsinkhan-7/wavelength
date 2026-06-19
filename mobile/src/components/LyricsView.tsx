import { useEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { activeLineIndex, type LrcLine } from '@/lib/lrc';
import { colors, font, spacing } from '@/theme';

const LINE_H = 38;

// Karaoke-style synced lyrics with the active line highlighted + auto-scrolled.
export default function LyricsView({
  synced,
  plain,
  position,
  accent,
  loading,
}: {
  synced: LrcLine[] | null;
  plain: string | null;
  position: number;
  accent: string;
  loading: boolean;
}) {
  const ref = useRef<ScrollView>(null);
  const active = synced ? activeLineIndex(synced, position) : -1;

  useEffect(() => {
    if (synced && active >= 0) {
      ref.current?.scrollTo({ y: Math.max(0, active * LINE_H - 120), animated: true });
    }
  }, [active, synced]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={accent} />
      </View>
    );
  }

  if (synced && synced.length) {
    return (
      <ScrollView ref={ref} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {synced.map((l, i) => (
          <Text
            key={i}
            style={[
              styles.line,
              i === active ? { color: accent, fontWeight: '800' } : styles.dim,
            ]}
          >
            {l.text || '♪'}
          </Text>
        ))}
      </ScrollView>
    );
  }

  if (plain) {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.plain}>{plain}</Text>
      </ScrollView>
    );
  }

  return (
    <View style={styles.center}>
      <Text style={styles.none}>No lyrics found for this track.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingVertical: spacing.lg },
  line: { fontSize: font.heading, height: LINE_H, lineHeight: LINE_H, fontWeight: '700' },
  dim: { color: colors.textMuted, opacity: 0.6 },
  plain: { color: colors.text, fontSize: font.body, lineHeight: 26 },
  none: { color: colors.textMuted, fontSize: font.body },
});
