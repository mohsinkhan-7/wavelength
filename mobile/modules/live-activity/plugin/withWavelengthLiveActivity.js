const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

/**
 * Adds the notification permissions the Android 16 "Live Update" chip needs.
 * Media-playback foreground-service permissions are NOT added here — expo-audio's
 * own config plugin already declares them and owns the MediaStyle notification.
 *
 *   POST_NOTIFICATIONS          → runtime (Android 13+); without it the chip is dropped
 *   POST_PROMOTED_NOTIFICATIONS → non-runtime (Android 16); required to promote to a Live Update
 */
const withWavelengthLiveActivity = (config) =>
  withAndroidManifest(config, (cfg) => {
    AndroidConfig.Permissions.ensurePermissions(cfg.modResults, [
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.POST_PROMOTED_NOTIFICATIONS',
    ]);
    return cfg;
  });

module.exports = withWavelengthLiveActivity;
