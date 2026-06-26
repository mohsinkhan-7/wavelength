import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import AppBackground from '@/components/AppBackground';
import Glass from '@/components/Glass';
import { Button, FormError, Input } from '@/components/ui';
import * as api from '@/api/backend';
import { colors, font, spacing } from '@/theme';

export default function ResetPassword() {
  const router = useRouter();
  const { email = '' } = useLocalSearchParams<{ email: string }>();

  const [otp, setOtp]               = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm]       = useState('');
  const [error, setError]           = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [resending, setResending]   = useState(false);

  const onReset = async () => {
    if (!otp || otp.length !== 6) { setError('Enter the 6-digit code'); return; }
    if (newPassword.length < 6)   { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirm)  { setError("Passwords don't match"); return; }
    setError(null);
    setLoading(true);
    try {
      await api.resetPassword(email, otp, newPassword);
      router.replace('/(auth)/login');
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setError(null);
    setResending(true);
    try {
      await api.forgotPassword(email);
    } catch (e: any) {
      setError(e.message || 'Could not resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <AppBackground />
      <View style={styles.header}>
        <Text style={styles.title}>Enter reset code</Text>
        <Text style={styles.sub}>
          We sent a 6-digit code to{'\n'}
          <Text style={styles.emailHighlight}>{email}</Text>
        </Text>
      </View>

      <Glass sheen radius={24} style={styles.card}>
        <View style={styles.form}>
          <Input
            placeholder="6-digit code"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
          />
          <Input
            placeholder="New password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <Input
            placeholder="Confirm new password"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />
          <FormError message={error} />
          <Button title="Reset password" onPress={onReset} loading={loading} />
          <Button title={resending ? 'Resending…' : 'Resend code'} variant="ghost" onPress={onResend} disabled={resending} />
        </View>
      </Glass>

      <View style={styles.footer}>
        <Link href="/(auth)/login" style={styles.link}>Back to login</Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, padding: spacing.xl, justifyContent: 'center' },
  header:          { alignItems: 'center', marginBottom: spacing.xl },
  title:           { color: colors.text, fontSize: font.title, fontWeight: '700', marginBottom: spacing.sm },
  sub:             { color: colors.textMuted, fontSize: font.body, textAlign: 'center', lineHeight: 22 },
  emailHighlight:  { color: colors.text, fontWeight: '600' },
  card:            { padding: spacing.lg },
  form:            { gap: spacing.md },
  footer:          { alignItems: 'center', marginTop: spacing.xl },
  link:            { color: colors.primary, fontSize: font.body, fontWeight: '700' },
});
