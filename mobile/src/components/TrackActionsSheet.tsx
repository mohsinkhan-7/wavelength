import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Artwork from './Artwork';
import { colors, font, radius, spacing } from '@/theme';
import { useUI } from '@/store/ui';
import { useLibrary } from '@/store/library';

export default function TrackActionsSheet() {
  const router = useRouter();
  const track = useUI((s) => s.actionTrack);
  const close = useUI((s) => s.closeTrackActions);

  const playlists = useLibrary((s) => s.playlists);
  const addToPlaylist = useLibrary((s) => s.addToPlaylist);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const isLiked = useLibrary((s) => (track ? s.isLiked(track.id) : false));
  const toggleLike = useLibrary((s) => s.toggleLike);
  const isDownloaded = useLibrary((s) => (track ? s.isDownloaded(track.id) : false));
  const download = useLibrary((s) => s.download);
  const removeDownload = useLibrary((s) => s.removeDownload);
  const progress = useLibrary((s) => (track ? s.downloadProgress[track.id] : undefined));

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  if (!track) return null;

  const handleAdd = async (playlistId: string) => {
    await addToPlaylist(playlistId, track);
    close();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const p = await createPlaylist(newName.trim());
    await addToPlaylist(p._id, track);
    setNewName('');
    setCreating(false);
    close();
  };

  const downloading = progress !== undefined;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={styles.sheetWrap}>
        <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.tint]} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.trackHead}>
            <Artwork uri={track.artwork} size={48} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={styles.title}>
                {track.title}
              </Text>
              <Text numberOfLines={1} style={styles.artist}>
                {track.artist}
              </Text>
            </View>
          </View>

          <Action
            icon={isLiked ? 'heart' : 'heart-outline'}
            label={isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
            tint={isLiked ? colors.like : colors.text}
            onPress={() => toggleLike(track)}
          />

          {track.artistId && (
            <Action
              icon="person-outline"
              label={`View artist · ${track.artist}`}
              onPress={() => {
                const dest = `${track.source}:${track.artistId}`;
                const name = track.artist;
                close();
                router.push({ pathname: '/artist/[id]', params: { id: dest, name } });
              }}
            />
          )}

          {track.previewOnly ? (
            <Action icon="lock-closed-outline" label="Preview only — can’t download" tint={colors.textFaint} onPress={() => {}} />
          ) : isDownloaded ? (
            <Action icon="trash-outline" label="Remove download" onPress={() => removeDownload(track.id)} />
          ) : (
            <Action
              icon="download-outline"
              label={downloading ? `Downloading… ${Math.round((progress ?? 0) * 100)}%` : 'Download for offline'}
              onPress={() => !downloading && download(track)}
            />
          )}

          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>Add to playlist</Text>

          <ScrollView style={{ maxHeight: 220 }}>
            {playlists.map((p) => (
              <Action key={p._id} icon="musical-notes" label={p.name} onPress={() => handleAdd(p._id)} />
            ))}

            {creating ? (
              <View style={styles.createRow}>
                <TextInput
                  autoFocus
                  placeholder="New playlist name"
                  placeholderTextColor={colors.textFaint}
                  value={newName}
                  onChangeText={setNewName}
                  style={styles.input}
                  onSubmitEditing={handleCreate}
                />
                <Pressable onPress={handleCreate} style={styles.createBtn}>
                  <Text style={styles.createBtnText}>Create</Text>
                </Pressable>
              </View>
            ) : (
              <Action icon="add" label="New playlist" tint={colors.primary} onPress={() => setCreating(true)} />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Action({
  icon,
  label,
  onPress,
  tint = colors.text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tint?: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.glass }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={tint} style={styles.actionIcon} />
      <Text style={[styles.actionLabel, { color: tint }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheetWrap: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: colors.glassBorder,
  },
  tint: { backgroundColor: 'rgba(14,12,24,0.7)' },
  sheet: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.glassBorder,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  trackHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  artist: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.hairline, marginVertical: spacing.sm },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: font.small,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  actionIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  actionLabel: { fontSize: font.body, flex: 1 },
  createRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.sm },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
  },
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 44,
    justifyContent: 'center',
  },
  createBtnText: { color: colors.white, fontWeight: '700' },
});
