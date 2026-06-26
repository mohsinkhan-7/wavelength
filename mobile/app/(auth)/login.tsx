import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import AppBackground from '@/components/AppBackground';
import Glass from '@/components/Glass';
import { Button, FormError, Input } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { colors, font, fonts, spacing } from '@/theme';

export default function Login() {
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e.message || 'Login failed');
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
        <View style={styles.brandRow}>
          <Image source={require('../../assets/icon.png')} style={styles.logoMark} />
          <Text style={styles.logo}>Wavelength</Text>
        </View>
        <Text style={styles.tagline}>Stream the world. Listen anywhere.</Text>
      </View>

      <Glass sheen radius={24} style={styles.card}>
        <View style={styles.form}>
          <Input
            placeholder="Email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Input placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
          <FormError message={error} />
          <Button title="Log in" onPress={onSubmit} loading={loading} />
        </View>
      </Glass>

      <View style={styles.footer}>
        <Text style={styles.footerText}>New here? </Text>
        <Link href="/(auth)/register" style={styles.link}>
          Create an account
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoMark: { width: 44, height: 44, borderRadius: 10 },
  logo: { color: colors.text, fontSize: font.title, fontFamily: fonts.display },
  tagline: { color: colors.textMuted, fontSize: font.body, marginTop: spacing.sm },
  card: { padding: spacing.lg },
  form: { gap: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: colors.textMuted, fontSize: font.body },
  link: { color: colors.primary, fontSize: font.body, fontWeight: '700' },
});
