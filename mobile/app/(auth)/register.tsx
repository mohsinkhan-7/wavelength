import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import AppBackground from '@/components/AppBackground';
import Glass from '@/components/Glass';
import { Button, FormError, Input } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { colors, font, fonts, spacing } from '@/theme';

export default function Register() {
  const register = useAuth((s) => s.register);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, displayName.trim());
    } catch (e: any) {
      setError(e.message || 'Registration failed');
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
        <Text style={styles.logo}>Create account</Text>
        <Text style={styles.tagline}>Sync your music across devices.</Text>
      </View>

      <Glass sheen radius={24} style={styles.card}>
        <View style={styles.form}>
          <Input placeholder="Display name" value={displayName} onChangeText={setDisplayName} />
          <Input
            placeholder="Email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Input
            placeholder="Password (min 6 chars)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <FormError message={error} />
          <Button title="Sign up" onPress={onSubmit} loading={loading} />
        </View>
      </Glass>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Link href="/(auth)/login" style={styles.link}>
          Log in
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  logo: { color: colors.text, fontSize: font.title, fontFamily: fonts.display },
  tagline: { color: colors.textMuted, fontSize: font.body, marginTop: spacing.sm },
  card: { padding: spacing.lg },
  form: { gap: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: colors.textMuted, fontSize: font.body },
  link: { color: colors.primary, fontSize: font.body, fontWeight: '700' },
});
