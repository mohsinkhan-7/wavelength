import { useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppBackground from '@/components/AppBackground';
import { useLibrary } from '@/store/library';
import { colors, font, fonts, radius, spacing } from '@/theme';

export default function Library() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const liked = useLibrary((s) => s.liked);
  const downloads = useLibrary((s) => s.downloads);
  const playlists = useLibrary((s) => s.playlists);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const removePlaylist = useLibrary((s) => s.removePlaylist);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createPlaylist(name.trim());
    setName('');
    setCreating(false);
  };

  const confirmDelete = (id: string, label: string) => {
    Alert.alert('Delete playlist', `Delete “${label}”?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removePlaylist(id) },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <AppBackground />
      <View style={styles.header}>
        <Text style={styles.heading}>Your Library</Text>
        <Pressable onPress={() => setCreating((c) => !c)} hitSlop={10} style={styles.addBtn}>
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={styles.add}>New</Text>
        </Pressable>
      </View>

      {creating && (
        <View style={styles.createRow}>
          <TextInput
            autoFocus
            placeholder="Playlist name"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            style={styles.input}
            onSubmitEditing={handleCreate}
          />
          <Pressable onPress={handleCreate} style={styles.createBtn}>
            <Text style={styles.createBtnText}>Create</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        ListHeaderComponent={
          <View>
            <ShortcutRow
              icon="heart"
              tint={colors.like}
              title="Liked Songs"
              subtitle={`${liked.length} song${liked.length === 1 ? '' : 's'}`}
              onPress={() => router.push('/playlist/liked')}
            />
            <ShortcutRow
              icon="download"
              tint={colors.primary}
              title="Downloads"
              subtitle={`${downloads.length} available offline`}
              onPress={() => router.push('/playlist/downloads')}
            />
            <Text style={styles.sectionLabel}>Playlists</Text>
          </View>
        }
        data={playlists}
        keyExtractor={(p) => p._id}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        ListEmptyComponent={<Text style={styles.empty}>No playlists yet. Tap “＋ New” to make one.</Text>}
        renderItem={({ item }) => (
          <ShortcutRow
            icon="musical-notes"
            tint={colors.text}
            title={item.name}
            subtitle={`${item.tracks.length} song${item.tracks.length === 1 ? '' : 's'}`}
            onPress={() => router.push(`/playlist/${item._id}`)}
            onLongPress={() => confirmDelete(item._id, item.name)}
          />
        )}
      />
    </View>
  );
}

function ShortcutRow({
  icon,
  tint,
  title,
  subtitle,
  onPress,
  onLongPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      onLongPress={onLongPress}
      android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  heading: { color: colors.text, fontSize: font.heading, fontFamily: fonts.display },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  add: { color: colors.primary, fontSize: font.body, fontWeight: '700' },
  createRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: colors.glass,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    color: colors.text,
  },
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  createBtnText: { color: colors.white, fontWeight: '700' },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: font.small,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  rowIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  rowTitle: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  rowSub: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  chevron: { color: colors.textMuted, fontSize: 24 },
  empty: { color: colors.textMuted, paddingHorizontal: spacing.lg, marginTop: spacing.md },
});
