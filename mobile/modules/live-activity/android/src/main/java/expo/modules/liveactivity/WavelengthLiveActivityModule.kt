package expo.modules.liveactivity

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

// Mirrors the iOS NowPlayingArgs record so the same JS state object maps cleanly.
// The numeric `*Sec` fields, `artworkUrl` and `canNext/canPrev` are Android-only;
// iOS simply doesn't declare them in its Record and ignores them.
class NowPlayingArgs : Record {
  @Field var title: String = ""
  @Field var artist: String = ""
  @Field var isPlaying: Boolean = true
  @Field var progress: Double = 0.0 // 0..1
  @Field var position: String = "0:00"
  @Field var duration: String = "0:00"
  @Field var positionSec: Double = 0.0
  @Field var durationSec: Double = 0.0
  @Field var artworkUrl: String? = null
  @Field var canNext: Boolean = false
  @Field var canPrev: Boolean = false
}

/**
 * Android counterpart of the iOS Live Activity. Shares the JS module name
 * ("WavelengthLiveActivity") so one JS surface drives both platforms.
 *
 * Unlike before, this module now OWNS the full Android media notification: it
 * runs a foreground [MediaPlaybackService] hosting a MediaSessionCompat and posts
 * a MediaStyle notification with prev / play-pause / next + a seek bar + artwork.
 * expo-audio's own lock-screen controls are intentionally NOT activated on Android
 * (see AudioController) so there is exactly one media surface — and one that
 * exposes real track-skip, which expo-audio deliberately omits.
 *
 * Control taps (notification, lock screen, Bluetooth/headset) are surfaced to JS
 * via the "onMediaAction" event, which drives the player store.
 */
class WavelengthLiveActivityModule : Module() {

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context unavailable" }

  override fun definition() = ModuleDefinition {
    Name("WavelengthLiveActivity")

    Events("onMediaAction")

    OnCreate { instance = this@WavelengthLiveActivityModule }
    OnDestroy { if (instance === this@WavelengthLiveActivityModule) instance = null }

    // Supported whenever the user has notifications enabled for the app.
    Function("isSupported") {
      NotificationManagerCompat.from(context).areNotificationsEnabled()
    }

    AsyncFunction("startActivity") { args: NowPlayingArgs, promise: Promise ->
      if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) {
        promise.resolve(null) // matches the iOS "not supported" path
        return@AsyncFunction
      }
      NowPlayingStore.current = args.toData()
      sendToService(MediaPlaybackService.ACTION_START)
      promise.resolve(mapOf("id" to SESSION_ID))
    }

    AsyncFunction("updateActivity") { _: String, args: NowPlayingArgs, promise: Promise ->
      NowPlayingStore.current = args.toData()
      sendToService(MediaPlaybackService.ACTION_UPDATE)
      promise.resolve(true)
    }

    AsyncFunction("endActivity") { _: String, promise: Promise ->
      sendToService(MediaPlaybackService.ACTION_STOP)
      promise.resolve(true)
    }
  }

  private fun sendToService(action: String) {
    val intent = Intent(context, MediaPlaybackService::class.java).apply { this.action = action }
    if (action == MediaPlaybackService.ACTION_START) {
      // Must promote to foreground promptly; startForegroundService requires the
      // service to call startForeground() within a few seconds.
      ContextCompat.startForegroundService(context, intent)
    } else {
      context.startService(intent)
    }
  }

  companion object {
    const val SESSION_ID = "android-media"

    // Set while the JS module is alive so the foreground service can surface
    // control events back to JS. Volatile: written/read across threads.
    @Volatile
    var instance: WavelengthLiveActivityModule? = null

    /** Called by the service (main thread) when a transport control is used. */
    fun emitAction(action: String, value: Double?) {
      val body = Bundle().apply {
        putString("action", action)
        if (value != null) putDouble("value", value)
      }
      instance?.sendEvent("onMediaAction", body)
    }
  }
}

private fun NowPlayingArgs.toData() = NowPlayingData(
  title = title,
  artist = artist,
  isPlaying = isPlaying,
  positionMs = (positionSec * 1000).toLong().coerceAtLeast(0),
  durationMs = (durationSec * 1000).toLong().coerceAtLeast(0),
  artworkUrl = artworkUrl?.takeIf { it.isNotBlank() },
  canNext = canNext,
  canPrev = canPrev,
)
