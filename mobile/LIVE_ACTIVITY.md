# Now Playing — Live Activity (iOS) & Media Controls (Android)

Wavelength shows the current track in each platform's "glanceable" surface, all
driven by one JS call (`syncNowPlaying`) from the audio engine:

- **iOS 16.2+** — a custom **Live Activity** in the **Dynamic Island** (compact,
  minimal, expanded) and on the Lock Screen, with title, artist, play/pause, and
  a progress bar.
- **Android** — a self-owned **MediaSession** + **MediaStyle notification** on the
  lock screen and notification shade, with artwork, a seek bar, and **prev /
  play-pause / next** controls. Also drives Bluetooth & wired headset buttons.

> The two platforms share the native module name `WavelengthLiveActivity`, so the
> same JS surface drives both. On web and in Expo Go the calls are safe no-ops.
> Both need a real build (`eas build` / `expo run:*`).

## Android specifics

The module **owns the entire media notification** — it does **not** use
expo-audio's built-in lock-screen controls. Why: expo-audio deliberately removes
the next/previous-track commands (it manages a single item, not our queue), so
its notification only offers seek ±15s. Instead, a foreground
[`MediaPlaybackService`](modules/live-activity/android/src/main/java/expo/modules/liveactivity/MediaPlaybackService.kt)
hosts a `MediaSessionCompat` and posts the notification with real track skip.

Key consequences:
- **`AudioController` skips `setActiveForLockScreen` on Android** (it's iOS-only
  now) so expo-audio never posts a competing notification.
- expo-audio's `setActiveForLockScreen` is also what kept background playback
  alive past ~3 min. Our foreground service (type `mediaPlayback`) **plus a
  `PARTIAL_WAKE_LOCK` held while playing** replaces that role.
- Control taps are forwarded to JS via the `onMediaAction` event
  ([index.ts](modules/live-activity/index.ts) → `addMediaActionListener`), which
  drives the player store (`next`/`prev`/`setPlaying`/`seek`). An externally
  forced pause (audio-focus loss) is mirrored back into the store in
  [AudioController.tsx](src/components/AudioController.tsx).

- Permissions injected by [the config plugin](modules/live-activity/plugin/withWavelengthLiveActivity.js):
  `POST_NOTIFICATIONS` (runtime, requested on first play via
  `ensureNotificationPermission()`) and `WAKE_LOCK`. The foreground-service
  media-playback permissions live in [app.json](app.json).
- Build & test on an Android device/emulator:
  ```bash
  cd mobile
  eas build -p android --profile development     # or: npx expo prebuild -p android && gradlew assembleDebug
  ```
  Play a track → the media notification appears on the lock screen and shade with
  working prev / play-pause / next, a seek bar, and artwork.

> **TODO (polish):** the notification small icon is currently the system
> `ic_media_play`. Swap in a branded monochrome icon
> ([MediaPlaybackService.kt](modules/live-activity/android/src/main/java/expo/modules/liveactivity/MediaPlaybackService.kt), `setSmallIcon`).

---

## iOS specifics

## How it's wired

| Piece | Location |
|-------|----------|
| Widget extension (SwiftUI + ActivityKit Dynamic Island UI) | [`targets/widget/`](targets/widget/) |
| Shared activity data contract | [`targets/widget/WavelengthActivityAttributes.swift`](targets/widget/WavelengthActivityAttributes.swift) |
| Native bridge module (start / update / end) | [`modules/live-activity/ios/`](modules/live-activity/ios/) |
| JS API (with off-iOS no-op fallback) | [`modules/live-activity/index.ts`](modules/live-activity/index.ts) |
| Player integration | [`src/components/AudioController.tsx`](src/components/AudioController.tsx) |
| Config (NSSupportsLiveActivities, app group, `@bacons/apple-targets`) | [`app.json`](app.json) |

The `@bacons/apple-targets` plugin turns `targets/widget/` into a real Widget
Extension target during prebuild. The local Expo module exposes
`startActivity / updateActivity / endActivity`; `AudioController` calls
`syncNowPlaying()` on track change, play/pause, and (throttled) on progress.

## ⚠️ One required manual step

ActivityKit links a running activity to the widget **by the
`WavelengthActivityAttributes` type**, so that exact type must be compiled into
**both** targets. After prebuild:

1. Run `npx expo prebuild -p ios` (generates the `ios/` project).
2. Open `ios/*.xcworkspace` in Xcode.
3. Select `targets/widget/WavelengthActivityAttributes.swift` → in the File
   Inspector, under **Target Membership**, tick **both** the main app target
   **and** the `WavelengthWidget` extension target.

(If you skip this, the native module won't find the attributes type and the
Live Activity won't appear.)

## Build & test

```bash
# Dev build on a device (Live Activities need a real device, not the simulator
# for the Dynamic Island — the simulator shows the Lock Screen activity):
npx expo prebuild -p ios
npx expo run:ios --device

# or via EAS:
eas build -p ios --profile development
```

Then play a track in the app → the Live Activity appears on the Lock Screen and
in the Dynamic Island. Long-press the island to see the expanded view.

## Customizing the look

Edit [`WavelengthLiveActivityWidget.swift`](targets/widget/WavelengthLiveActivityWidget.swift):
- `compactLeading` / `compactTrailing` — the two pills beside the island
- `minimal` — shown when multiple activities are active
- `DynamicIslandExpandedRegion(...)` — the long-press expanded layout
- `LockScreenView` — the Lock Screen / banner card

To show real artwork (instead of the SF Symbol), download the image to the
shared app group container from the app and load it from disk in the widget
(WidgetKit can't fetch remote images directly).
