import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import AppBackground from '@/components/AppBackground';
import Glass from '@/components/Glass';
import { Button, FormError, Input } from '@/components/ui';
import * as api from '@/api/backend';
import { colors, font, spacing } from '@/theme';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail]   = useState('');
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSend = async () => {
    const trimmed = email.trim();
    if (!trimmed) { setError('Enter your email address'); return; }
    setError(null);
    setLoading(true);
    try {
      await api.forgotPassword(trimmed);
      router.push({ pathname: '/(auth)/reset-password', params: { email: trimmed } });
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <AppBackground />
      <View style={styles.header}>
        <Text style={styles.title}>Forgot password?</Text>
        <Text style={styles.sub}>Enter your email and we'll send a 6-digit reset code.</Text>
      </View>

      <Glass sheen radius={24} style={styles.card}>
        <View style={styles.form}>
          <Input
            placeholder="Email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <FormError message={error} />
          <Button title="Send reset code" onPress={onSend} loading={loading} />
        </View>
      </Glass>

      <View style={styles.footer}>
        <Link href="/(auth)/login" style={styles.link}>Back to login</Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, justifyContent: 'center' },
  header:    { alignItems: 'center', marginBottom: spacing.xl },
  title:     { color: colors.text, fontSize: font.title, fontWeight: '700', marginBottom: spacing.sm },
  sub:       { color: colors.textMuted, fontSize: font.body, textAlign: 'center' },
  card:      { padding: spacing.lg },
  form:      { gap: spacing.md },
  footer:    { alignItems: 'center', marginTop: spacing.xl },
  link:      { color: colors.primary, fontSize: font.body, fontWeight: '700' },
});
