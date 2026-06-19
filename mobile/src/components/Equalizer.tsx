import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

// Animated "now playing" equalizer bars. When paused, bars rest low.
export default function Equalizer({
  color = colors.primary,
  size = 16,
  playing = true,
}: {
  color?: string;
  size?: number;
  playing?: boolean;
}) {
  const b1 = useRef(new Animated.Value(0.4)).current;
  const b2 = useRef(new Animated.Value(0.9)).current;
  const b3 = useRef(new Animated.Value(0.6)).current;
  const bars = [b1, b2, b3];

  useEffect(() => {
    const anims = bars.map((b, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(b, { toValue: 1, duration: 280 + i * 130, useNativeDriver: false }),
          Animated.timing(b, { toValue: 0.3, duration: 280 + i * 130, useNativeDriver: false }),
        ])
      )
    );
    if (playing) anims.forEach((a) => a.start());
    else bars.forEach((b) => b.setValue(0.35));
    return () => anims.forEach((a) => a.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  return (
    <View style={[styles.row, { height: size }]}>
      {bars.map((b, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            backgroundColor: color,
            height: b.interpolate({ inputRange: [0, 1], outputRange: [size * 0.3, size] }),
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
});
