import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/theme';

export default function Artwork({ uri, size = 52 }: { uri?: string; size?: number }) {
  const r = size >= 120 ? radius.lg : radius.sm;
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: r, backgroundColor: colors.glassStrong }}
      />
    );
  }
  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: r },
      ]}
    >
      <Text style={{ fontSize: size * 0.4 }}>🎵</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.glassStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
