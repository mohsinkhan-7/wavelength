# Now Playing — Live Activity (iOS) & Live Update (Android)

Wavelength shows the current track in each platform's "glanceable" surface, all
driven by one JS call (`syncNowPlaying`) from the audio engine:

- **iOS 16.2+** — a custom **Live Activity** in the **Dynamic Island** (compact,
  minimal, expanded) and on the Lock Screen, with title, artist, play/pause, and
  a progress bar.
- **Android 16+ (API 36)** — a **Live Update**: a promoted-ongoing
  `ProgressStyle` notification that surfaces as a **status-bar chip near the
  camera cutout** and on the lock screen / AOD.

> The two platforms share the native module name `WavelengthLiveActivity`, so the
> same JS surface drives both. On web, Expo Go, and Android < 16 the calls are
> safe no-ops. Both need a real build (`eas build` / `expo run:*`) — neither runs
> in Expo Go or on web.

## Android specifics

**expo-audio already posts the standard MediaStyle media notification** (lock
screen + media transport controls) when a track plays — so this module does
**not** duplicate it. It adds *only* the Android 16 Live Update chip
([WavelengthLiveActivityModule.kt](modules/live-activity/android/src/main/java/expo/modules/liveactivity/WavelengthLiveActivityModule.kt)).

- Permissions injected by [the config plugin](modules/live-activity/plugin/withWavelengthLiveActivity.js):
  `POST_NOTIFICATIONS` (runtime, requested on first play via
  `ensureNotificationPermission()`) and `POST_PROMOTED_NOTIFICATIONS` (Android 16).
- `compileSdk`/`targetSdk` are pinned to **36** via `expo-build-properties` in
  [app.json](app.json) so the `ProgressStyle` APIs resolve.
- Build & test on an **Android 16 device/emulator**:
  ```bash
  cd mobile
  eas build -p android --profile development     # or: npx expo prebuild -p android && gradlew assembleDebug
  ```
  Play a track → you'll see **two** surfaces: expo-audio's media card *and* our
  progress chip by the cutout. On Android 13–15 only the media card appears
  (the chip cleanly no-ops).

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
