import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppBackground from '@/components/AppBackground';
import Glass from '@/components/Glass';
import { Button, FormError, Input } from '@/components/ui';
import * as api from '@/api/backend';
import { useAuth } from '@/store/auth';
import { useLibrary } from '@/store/library';
import { colors, font, fonts, gradients, radius, spacing } from '@/theme';
import type { Stats } from '@/types';

const SOURCE_LABELS: Record<string, string> = {
  audius: 'Audius',
  jamendo: 'Jamendo',
  jiosaavn: 'JioSaavn',
  archive: 'Archive',
  deezer: 'Deezer',
};

export default function Profile() {
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  const updateProfile = useAuth((s) => s.updateProfile);
  const logout = useAuth((s) => s.logout);

  const liked = useLibrary((s) => s.liked);
  const playlists = useLibrary((s) => s.playlists);
  const downloads = useLibrary((s) => s.downloads);
  const followedArtists = useLibrary((s) => s.followedArtists);

  const [name, setName] = useState(user?.displayName ?? '');
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [nameErr, setNameErr] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);

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

  const loadStats = async () => {
    if (statsLoading) return;
    setStatsLoading(true);
    try {
      const data = await api.getStats();
      setStats(data);
      setShowStats(true);
    } catch {
      /* offline or empty history */
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []); // load stats once on mount

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

        {/* Library stats row */}
        <View style={styles.stats}>
          <Stat label="Liked" value={liked.length} />
          <Stat label="Playlists" value={playlists.length} />
          <Stat label="Downloads" value={downloads.length} />
          <Stat label="Following" value={followedArtists.length} />
        </View>

        {/* Listening stats */}
        {showStats && stats ? (
          <Glass radius={radius.lg} style={styles.card}>
            <Text style={styles.cardTitle}>Listening Stats</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBig}>
                <Text style={styles.statBigNum}>{stats.totalPlays}</Text>
                <Text style={styles.statBigLabel}>Tracks played</Text>
              </View>
              <View style={styles.statBig}>
                <Text style={styles.statBigNum}>{stats.totalMinutes}</Text>
                <Text style={styles.statBigLabel}>Minutes listened</Text>
              </View>
            </View>

            {stats.topArtists.length > 0 && (
              <View style={styles.listSection}>
                <Text style={styles.listTitle}>Top Artists</Text>
                {stats.topArtists.map((a, i) => (
                  <View key={a.name} style={styles.listRow}>
                    <Text style={styles.listRank}>{i + 1}</Text>
                    <Text style={styles.listLabel} numberOfLines={1}>{a.name}</Text>
                    <Text style={styles.listCount}>{a.count}×</Text>
                  </View>
                ))}
              </View>
            )}

            {stats.topSources.length > 0 && (
              <View style={styles.listSection}>
                <Text style={styles.listTitle}>By Catalog</Text>
                {stats.topSources.map((s) => (
                  <View key={s.source} style={styles.listRow}>
                    <Text style={styles.listLabel}>{SOURCE_LABELS[s.source] ?? s.source}</Text>
                    <Text style={styles.listCount}>{s.count} tracks</Text>
                  </View>
                ))}
              </View>
            )}

            {stats.dailyActivity.length > 0 && (
              <View style={styles.listSection}>
                <Text style={styles.listTitle}>Last 7 Days</Text>
                <View style={styles.barChart}>
                  {stats.dailyActivity.map((d) => {
                    const max = Math.max(...stats.dailyActivity.map((x) => x.count), 1);
                    const pct = d.count / max;
                    return (
                      <View key={d.date} style={styles.barCol}>
                        <View style={[styles.bar, { height: Math.max(4, pct * 48) }]} />
                        <Text style={styles.barLabel}>{d.date.slice(5)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </Glass>
        ) : (
          !statsLoading && (
            <Glass radius={radius.lg} style={[styles.card, { alignItems: 'center' }]}>
              <Text style={styles.cardTitle}>Listening Stats</Text>
              <Text style={[styles.email, { textAlign: 'center', marginBottom: spacing.md }]}>
                Play some tracks to see your stats here.
              </Text>
            </Glass>
          )
        )}

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
  stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl, flexWrap: 'wrap' },
  stat: { flex: 1, minWidth: 70, alignItems: 'center', paddingVertical: spacing.lg },
  statValue: { color: colors.text, fontSize: font.heading, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLabel: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  card: { padding: spacing.lg, gap: spacing.md, marginBottom: spacing.lg },
  cardTitle: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  success: { color: colors.accent, fontSize: font.small },

  // Listening stats
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statBig: { flex: 1, backgroundColor: colors.glass, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  statBigNum: { color: colors.text, fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statBigLabel: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2 },
  listSection: { marginTop: spacing.sm },
  listTitle: {
    color: colors.textMuted,
    fontSize: font.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 5 },
  listRank: { color: colors.textMuted, fontSize: font.small, width: 18, fontVariant: ['tabular-nums'] },
  listLabel: { color: colors.text, fontSize: font.body, flex: 1 },
  listCount: { color: colors.textMuted, fontSize: font.small, fontVariant: ['tabular-nums'] },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 64, marginTop: spacing.xs },
  barCol: { flex: 1, alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  bar: { width: '80%', backgroundColor: colors.primary, borderRadius: 3, minHeight: 4 },
  barLabel: { color: colors.textMuted, fontSize: 9, fontVariant: ['tabular-nums'] },
});
