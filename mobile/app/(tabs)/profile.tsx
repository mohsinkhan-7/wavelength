import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppBackground from '@/components/AppBackground';
import Glass from '@/components/Glass';
import { Button, FormError, Input } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { useLibrary } from '@/store/library';
import { colors, font, fonts, gradients, radius, spacing } from '@/theme';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  const updateProfile = useAuth((s) => s.updateProfile);
  const logout = useAuth((s) => s.logout);

  const liked = useLibrary((s) => s.liked);
  const playlists = useLibrary((s) => s.playlists);
  const downloads = useLibrary((s) => s.downloads);

  // Display-name editing
  const [name, setName] = useState(user?.displayName ?? '');
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [nameErr, setNameErr] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  // Password change
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const initial = (user?.displayName || user?.email || '?').trim().charAt(0).toUpperCase();

  const saveName = async () => {
    setNameErr(null);
    setNameMsg(null);
    if (!name.trim()) {
      setNameErr('Display name cannot be empty');
      return;
    }
    setSavingName(true);
    try {
      await updateProfile({ displayName: name.trim() });
      setNameMsg('Saved ✓');
    } catch (e: any) {
      setNameErr(e.message || 'Could not save');
    } finally {
      setSavingName(false);
    }
  };

  const changePassword = async () => {
    setPwErr(null);
    setPwMsg(null);
    if (newTooShort(next)) {
      setPwErr('New password must be at least 6 characters');
      return;
    }
    setSavingPw(true);
    try {
      await updateProfile({ currentPassword: current, newPassword: next });
      setPwMsg('Password updated ✓');
      setCurrent('');
      setNext('');
    } catch (e: any) {
      setPwErr(e.message || 'Could not update password');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <AppBackground />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl * 3, paddingHorizontal: spacing.lg }}>
        <Text style={styles.heading}>Profile</Text>

        {/* Identity */}
        <View style={styles.identity}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </LinearGradient>
          <Text style={styles.name}>{user?.displayName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <Stat label="Liked" value={liked.length} />
          <Stat label="Playlists" value={playlists.length} />
          <Stat label="Downloads" value={downloads.length} />
        </View>

        {/* Edit display name */}
        <Glass radius={radius.lg} style={styles.card}>
          <Text style={styles.cardTitle}>Display name</Text>
          <Input value={name} onChangeText={setName} placeholder="Display name" autoCapitalize="words" />
          {nameErr ? <FormError message={nameErr} /> : nameMsg ? <Text style={styles.success}>{nameMsg}</Text> : null}
          <Button title="Save" onPress={saveName} loading={savingName} />
        </Glass>

        {/* Change password */}
        <Glass radius={radius.lg} style={styles.card}>
          <Text style={styles.cardTitle}>Change password</Text>
          <Input value={current} onChangeText={setCurrent} placeholder="Current password" secureTextEntry />
          <Input value={next} onChangeText={setNext} placeholder="New password (min 6 chars)" secureTextEntry />
          {pwErr ? <FormError message={pwErr} /> : pwMsg ? <Text style={styles.success}>{pwMsg}</Text> : null}
          <Button title="Update password" onPress={changePassword} loading={savingPw} />
        </Glass>

        <View style={{ height: spacing.lg }} />
        <Button title="Log out" variant="ghost" onPress={logout} />
      </ScrollView>
    </View>
  );
}

function newTooShort(pw: string) {
  return !pw || pw.length < 6;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Glass radius={radius.md} style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Glass>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  heading: { color: colors.text, fontSize: font.heading, fontFamily: fonts.display, marginBottom: spacing.lg },
  identity: { alignItems: 'center', marginBottom: spacing.xl },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { color: colors.white, fontSize: 40, fontWeight: '800' },
  name: { color: colors.text, fontSize: font.title, fontFamily: fonts.display },
  email: { color: colors.textMuted, fontSize: font.body, marginTop: spacing.xs },
  stats: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg },
  statValue: { color: colors.text, fontSize: font.heading, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  card: { padding: spacing.lg, gap: spacing.md, marginBottom: spacing.lg },
  cardTitle: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  success: { color: colors.accent, fontSize: font.small },
});
