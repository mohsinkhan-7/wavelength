const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

/**
 * Adds the permissions our self-owned media notification needs. The foreground
 * MediaPlaybackService hosts the MediaSessionCompat and posts the MediaStyle
 * notification; the foreground-service media-playback permissions are already
 * declared in app.json (shared with expo-audio).
 *
 *   POST_NOTIFICATIONS → runtime (Android 13+); without it the media notification is dropped
 *   WAKE_LOCK          → keep audio decoding alive while the screen is off
 */
const withWavelengthLiveActivity = (config) =>
  withAndroidManifest(config, (cfg) => {
    AndroidConfig.Permissions.ensurePermissions(cfg.modResults, [
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.WAKE_LOCK',
    ]);
    return cfg;
  });

module.exports = withWavelengthLiveActivity;
