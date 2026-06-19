import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius as r } from '@/theme';

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  radius?: number;
  // Adds a subtle top-down sheen highlight (like light catching the edge).
  sheen?: boolean;
  // Stronger fill for primary surfaces.
  strong?: boolean;
  bordered?: boolean;
};

/** A frosted-glass panel: blur + translucent fill + light hairline border. */
export default function Glass({
  children,
  style,
  intensity = 40,
  radius = r.lg,
  sheen = false,
  strong = false,
  bordered = true,
}: Props) {
  return (
    <View
      style={[
        {
          borderRadius: radius,
          overflow: 'hidden',
          borderWidth: bordered ? 1 : 0,
          borderColor: colors.glassBorder,
          backgroundColor: 'rgba(255,255,255,0.02)',
        },
        style,
      ]}
    >
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: strong ? colors.glassStrong : colors.glass },
        ]}
      />
      {sheen && (
        <LinearGradient
          colors={gradients.sheen}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
        />
      )}
      {children}
    </View>
  );
}
