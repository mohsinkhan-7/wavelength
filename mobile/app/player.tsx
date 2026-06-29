import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Artwork from '@/components/Artwork';
import LyricsView from '@/components/LyricsView';
import { getAccentColor, getLyrics, type Lyrics } from '@/api/extras';
import { formatTime } from '@/lib/format';
import { tapLight, tapMedium } from '@/lib/haptics';
import { useLibrary } from '@/store/library';
import { usePlayer } from '@/store/player';
import { useUI } from '@/store/ui';
import { colors, font, fonts, gradients, radius, shadow, spacing } from '@/theme';

// Lighten/darken a hex colour (pct in [-1, 1]).
function shade(hex: string, pct: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  if (Number.isNaN(n)) return hex;
  const cl = (x: number) => Math.max(0, Math.min(255, Math.round(x)));
  const r = cl(((n >> 16) & 255) * (1 + pct));
  const g = cl(((n >> 8) & 255) * (1 + pct));
  const b = cl((n & 255) * (1 + pct));
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const track = usePlayer((s) => s.queue[s.index] ?? null);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const seek = usePlayer((s) => s.seek);
  const setShuffle = usePlayer((s) => s.setShuffle);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);
  const sleepTimerEndsAt = usePlayer((s) => s.sleepTimerEndsAt);
  const setSleepTimer = usePlayer((s) => s.setSleepTimer);
  const radioMode = usePlayer((s) => s.radioMode);
  const setRadioMode = usePlayer((s) => s.setRadioMode);

  const openActions = useUI((s) => s.openTrackActions);
  const isLiked = useLibrary((s) => (track ? s.isLiked(track.id) : false));
  const toggleLike = useLibrary((s) => s.toggleLike);
  const isDownloaded = useLibrary((s) => (track ? s.isDownloaded(track.id) : false));
  const download = useLibrary((s) => s.download);
  const progress = useLibrary((s) => (track ? s.downloadProgress[track.id] : undefined));

  const [scrub, setScrub] = useState<number | null>(null);
  const [accent, setAccent] = useState<string | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);

  const sleepMinutesLeft = sleepTimerEndsAt !== null
    ? Math.max(1, Math.ceil((sleepTimerEndsAt - Date.now()) / 60000))
    : null;

  const trackId = track?.id;
  const artwork = track?.artwork;

  // Per-track accent colour from the artwork.
  useEffect(() => {
    let alive = true;
    setAccent(null);
    if (artwork) getAccentColor(artwork).then((c) => alive && setAccent(c));
    return () => {
      alive = false;
    };
  }, [artwork]);

  // Lazily fetch lyrics when the panel is opened (and on track change while open).
  useEffect(() => {
    if (!track || !showLyrics) {
      setLyrics(null);
      return;
    }
    setLyricsLoading(true);
    let alive = true;
    getLyrics(track)
      .then((l) => alive && setLyrics(l))
      .finally(() => alive && setLyricsLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, showLyrics]);

  // Entrance animation (expand from the mini-player).
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 360, useNativeDriver: true }).start();
  }, [enter]);

  if (!track) {
    return (
      <View style={[styles.container, styles.center]}>
        <LinearGradient colors={gradients.playerBackdrop} style={StyleSheet.absoluteFill} />
        <Text style={styles.muted}>Nothing playing.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const sliderValue = scrub ?? position;
  const downloading = progress !== undefined;
  const tint = accent ?? colors.primary;
  const playGradient = (accent ? [accent, shade(accent, -0.42)] : gradients.brand) as [string, string, ...string[]];
  const enterStyle = {
    opacity: enter,
    transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
  };

  return (
    <View
      style={[styles.container, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }]}
    >
      {/* Backdrop derived from the artwork. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {artwork ? (
          <>
            <Image source={{ uri: artwork }} style={StyleSheet.absoluteFill} blurRadius={50} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(7,6,13,0.55)' }]} />
            {accent && <View style={[StyleSheet.absoluteFill, { backgroundColor: accent, opacity: 0.16 }]} />}
          </>
        ) : (
          <LinearGradient colors={gradients.playerBackdrop} style={StyleSheet.absoluteFill} />
        )}
      </View>

      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-down" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.nowPlaying}>NOW PLAYING</Text>
        <Pressable hitSlop={12} onPress={() => openActions(track)}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
        </Pressable>
      </View>

      <Animated.View style={[styles.stage, enterStyle]}>
        {showLyrics ? (
          <View style={styles.lyricsBox}>
            <LyricsView
              synced={lyrics?.synced ?? null}
              plain={lyrics?.plain ?? null}
              position={position}
              accent={tint}
              loading={lyricsLoading}
            />
          </View>
        ) : (
          <View style={[styles.artShadow, shadow]}>
            <Artwork uri={track.artwork} size={300} />
          </View>
        )}
      </Animated.View>

      <View style={styles.info}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1}>
            {track.title}
          </Text>
          {track.artistId ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/artist/[id]',
                  params: { id: `${track.source}:${track.artistId}`, name: track.artist },
                })
              }
              hitSlop={6}
            >
              <Text style={[styles.artist, { color: tint }]} numberOfLines={1}>
                {track.artist} ›
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.artist} numberOfLines={1}>
              {track.artist}
            </Text>
          )}
          {track.previewOnly && (
            <View style={styles.previewPill}>
              <Text style={styles.previewPillText}>30-SECOND PREVIEW · DEEZER</Text>
            </View>
          )}
        </View>
        <Pressable hitSlop={12} onPress={() => setShowLyrics((v) => !v)} style={styles.lyricsToggle}>
          <Ionicons name="mic" size={22} color={showLyrics ? tint : colors.textMuted} />
        </Pressable>
        <Pressable
          hitSlop={10}
          onPress={() => {
            tapLight();
            toggleLike(track);
          }}
        >
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={28} color={isLiked ? colors.like : colors.textMuted} />
        </Pressable>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={duration > 0 ? duration : 1}
        value={sliderValue}
        minimumTrackTintColor={tint}
        maximumTrackTintColor="rgba(255,255,255,0.18)"
        thumbTintColor={colors.white}
        onValueChange={(v) => setScrub(v)}
        onSlidingComplete={(v) => {
          seek(v);
          setScrub(null);
        }}
      />
      <View style={styles.times}>
        <Text style={styles.time}>{formatTime(sliderValue)}</Text>
        <Text style={styles.time}>{formatTime(duration)}</Text>
      </View>

      <View style={styles.controlsWrap}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.controlsTint]} />
        <View style={styles.controls}>
          <Pressable
            hitSlop={10}
            onPress={() => {
              tapLight();
              setShuffle(!shuffle);
            }}
          >
            <Ionicons name="shuffle" size={24} color={shuffle ? tint : colors.textMuted} />
          </Pressable>
          <Pressable
            hitSlop={10}
            onPress={() => {
              tapLight();
              prev();
            }}
          >
            <Ionicons name="play-skip-back" size={30} color={colors.text} />
          </Pressable>
          <Pressable
            style={styles.playFab}
            onPress={() => {
              tapMedium();
              toggle();
            }}
          >
            <LinearGradient colors={playGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color={colors.white} />
          </Pressable>
          <Pressable
            hitSlop={10}
            onPress={() => {
              tapLight();
              next();
            }}
          >
            <Ionicons name="play-skip-forward" size={30} color={colors.text} />
          </Pressable>
          <Pressable
            hitSlop={10}
            onPress={() => {
              tapLight();
              cycleRepeat();
            }}
          >
            <Ionicons name="repeat" size={24} color={repeat !== 'off' ? tint : colors.textMuted} />
            {repeat === 'one' && <View style={[styles.repeatOneDot, { backgroundColor: tint }]} />}
          </Pressable>
        </View>
      </View>

      <View style={styles.bottomRow}>
        {isDownloaded ? (
          <Text style={styles.downloadedTag}>⬇ Available offline</Text>
        ) : (
          <Pressable onPress={() => !downloading && download(track)} hitSlop={8}>
            <Text style={[styles.downloadBtn, { color: tint }]}>
              {downloading ? `Downloading… ${Math.round((progress ?? 0) * 100)}%` : '⬇ Download'}
            </Text>
          </Pressable>
        )}
        <View style={styles.extraControls}>
          <Pressable onPress={() => setShowSleepPicker(true)} hitSlop={8}>
            <Text style={[styles.extraBtn, sleepTimerEndsAt !== null ? { color: tint } : null]}>
              {sleepMinutesLeft !== null ? `⏱ ${sleepMinutesLeft}m` : '⏱ Sleep'}
            </Text>
          </Pressable>
          <Pressable onPress={() => setRadioMode(!radioMode)} hitSlop={8}>
            <Text style={[styles.extraBtn, radioMode ? { color: tint } : null]}>
              {'📻'} {radioMode ? 'Radio On' : 'Radio'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Sleep timer picker */}
      <Modal visible={showSleepPicker} transparent animationType="fade" onRequestClose={() => setShowSleepPicker(false)}>
        <Pressable style={styles.sleepBackdrop} onPress={() => setShowSleepPicker(false)} />
        <View style={styles.sleepSheet}>
          <Text style={styles.sleepTitle}>Sleep Timer</Text>
          {[15, 30, 45, 60].map((m) => (
            <Pressable
              key={m}
              style={[styles.sleepOption, sleepMinutesLeft !== null && Math.abs(sleepMinutesLeft - m) < 2 && { backgroundColor: tint + '22' }]}
              onPress={() => { setSleepTimer(m); setShowSleepPicker(false); }}
            >
              <Text style={styles.sleepOptionText}>{m} minutes</Text>
            </Pressable>
          ))}
          {sleepTimerEndsAt !== null && (
            <Pressable style={styles.sleepOption} onPress={() => { setSleepTimer(null); setShowSleepPicker(false); }}>
              <Text style={[styles.sleepOptionText, { color: colors.textMuted }]}>Turn off</Text>
            </Pressable>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xl },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  muted: { color: colors.textMuted, fontSize: font.body },
  close: { color: colors.primary, fontSize: font.body, fontWeight: '700' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nowPlaying: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '800', letterSpacing: 1.5 },
  stage: { height: 320, alignItems: 'center', justifyContent: 'center', marginVertical: spacing.lg },
  artShadow: { borderRadius: radius.xl, overflow: 'visible' },
  lyricsBox: { flex: 1, alignSelf: 'stretch', paddingHorizontal: spacing.sm },
  info: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { color: colors.text, fontSize: font.heading, fontFamily: fonts.display },
  artist: { color: colors.textMuted, fontSize: font.body, marginTop: spacing.xs },
  lyricsToggle: {},
  repeatOneDot: { position: 'absolute', top: -3, right: -3, width: 6, height: 6, borderRadius: 3 },
  previewPill: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  previewPillText: { color: colors.accent, fontSize: font.tiny, fontWeight: '800', letterSpacing: 0.5 },
  slider: { width: '100%', height: 40, marginTop: spacing.lg },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -spacing.xs },
  time: { color: colors.textMuted, fontSize: font.tiny },
  controlsWrap: {
    marginTop: spacing.xl,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  controlsTint: { backgroundColor: colors.glass },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  playFab: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadow,
  },
  bottomRow: { alignItems: 'center', marginTop: spacing.lg, gap: spacing.md },
  downloadBtn: { color: colors.primary, fontSize: font.body, fontWeight: '700' },
  downloadedTag: { color: colors.textMuted, fontSize: font.small },
  extraControls: { flexDirection: 'row', gap: spacing.xl },
  extraBtn: { color: colors.textMuted, fontSize: font.small, fontWeight: '700' },
  sleepBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sleepSheet: {
    backgroundColor: colors.glass,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    borderTopWidth: 1,
    borderColor: colors.glassBorder,
  },
  sleepTitle: { color: colors.text, fontSize: font.body, fontWeight: '800', marginBottom: spacing.md, textAlign: 'center' },
  sleepOption: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  sleepOptionText: { color: colors.text, fontSize: font.body, textAlign: 'center' },
});
