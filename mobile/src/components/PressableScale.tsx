import { ReactNode, useRef } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle } from 'react-native';

// Pressable that gently scales down on press for a tactile, premium feel.
export default function PressableScale({
  children,
  style,
  onPress,
  onLongPress,
  to = 0.96,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
  to?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => spring(to)}
      onPressOut={() => spring(1)}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
