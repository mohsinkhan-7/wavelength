import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme';

/**
 * Full-screen ambient backdrop: a dark vertical gradient with a few soft,
 * low-opacity colour "glow" blobs. No backdrop-filter here — a full-screen
 * blur veils the content above it on web. The frosted-glass effect comes from
 * the localized <Glass> panels instead.
 */
export default function AppBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#160F2C', '#0B0916', colors.bg]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Soft glows — stacked concentric discs fake a radial falloff. */}
      <Glow style={styles.violet} color={colors.glowViolet} />
      <Glow style={styles.teal} color={colors.glowTeal} />
      <Glow style={styles.pink} color={colors.glowPink} />
    </View>
  );
}

function Glow({ style, color }: { style: any; color: string }) {
  return (
    <View style={[styles.glow, style]}>
      <View style={[styles.disc, { backgroundColor: color, opacity: 0.18 }]} />
      <View style={[styles.disc, styles.discInner, { backgroundColor: color, opacity: 0.16 }]} />
    </View>
  );
}

const SIZE = 460;
const styles = StyleSheet.create({
  glow: { position: 'absolute', width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  disc: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, position: 'absolute' },
  discInner: { width: SIZE * 0.6, height: SIZE * 0.6, borderRadius: SIZE * 0.3 },
  violet: { top: -150, right: -120 },
  teal: { bottom: 20, left: -160 },
  pink: { top: '40%', right: -180 },
});
