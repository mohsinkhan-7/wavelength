import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font, gradients, radius, shadow, spacing } from '@/theme';

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  style,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
  style?: StyleProp<ViewStyle>;
}) {
  const isPrimary = variant === 'primary';
  const content = loading ? (
    <ActivityIndicator color={isPrimary ? colors.white : colors.primary} />
  ) : (
    <Text style={[styles.btnText, !isPrimary && { color: colors.text }]}>{title}</Text>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        isPrimary ? shadow : null,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.fill]}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fill, styles.ghostFill]} />
      )}
      {content}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textFaint}
      style={styles.input}
      autoCapitalize="none"
      {...props}
    />
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  fill: { borderRadius: radius.md },
  ghostFill: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  btnText: { color: colors.white, fontSize: font.body, fontWeight: '700', letterSpacing: 0.3 },
  input: {
    height: 52,
    backgroundColor: colors.glass,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontSize: font.body,
  },
  error: { color: colors.danger, fontSize: font.small },
  card: {
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
  },
});
