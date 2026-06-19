package expo.modules.liveactivity

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

// Mirrors the iOS NowPlayingArgs record so the same JS state object maps cleanly.
class NowPlayingArgs : Record {
  @Field var title: String = ""
  @Field var artist: String = ""
  @Field var isPlaying: Boolean = true
  @Field var progress: Double = 0.0 // 0..1
  @Field var position: String = "0:00"
  @Field var duration: String = "0:00"
}

/**
 * Android counterpart of the iOS Live Activity. Shares the JS module name
 * ("WavelengthLiveActivity") so one JS surface drives both platforms.
 *
 * expo-audio already posts the standard MediaStyle media notification (lock
 * screen + media controls), so this module posts ONLY the Android 16 "Live
 * Update" — a promoted-ongoing ProgressStyle notification that surfaces as a
 * status-bar chip near the camera cutout. Below API 36 it is a hard no-op to
 * avoid duplicating expo-audio's card.
 */
class WavelengthLiveActivityModule : Module() {

  private val channelId = "wavelength_live_update"
  private val notifId = 47110815

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context unavailable" }

  // Android 16 = API 36. Promoted-ongoing Live Updates only exist here.
  private val liveUpdatesAvailable: Boolean
    get() = Build.VERSION.SDK_INT >= 36

  override fun definition() = ModuleDefinition {
    Name("WavelengthLiveActivity")

    // Supported only on Android 16+ AND when notifications are enabled.
    Function("isSupported") {
      liveUpdatesAvailable && NotificationManagerCompat.from(context).areNotificationsEnabled()
    }

    AsyncFunction("startActivity") { args: NowPlayingArgs, promise: Promise ->
      if (!liveUpdatesAvailable || !NotificationManagerCompat.from(context).areNotificationsEnabled()) {
        promise.resolve(null) // matches the iOS "not supported" path
        return@AsyncFunction
      }
      ensureChannel()
      postChip(args)
      promise.resolve(mapOf("id" to notifId.toString()))
    }

    AsyncFunction("updateActivity") { _: String, args: NowPlayingArgs, promise: Promise ->
      if (!liveUpdatesAvailable) {
        promise.resolve(false)
        return@AsyncFunction
      }
      postChip(args) // re-notify with the same id = in-place update
      promise.resolve(true)
    }

    AsyncFunction("endActivity") { _: String, promise: Promise ->
      NotificationManagerCompat.from(context).cancel(notifId)
      promise.resolve(true)
    }
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      // IMPORTANCE_LOW: ongoing progress, never buzz/heads-up on each tick.
      val channel = NotificationChannel(channelId, "Now Playing", NotificationManager.IMPORTANCE_LOW).apply {
        description = "Live progress for the currently playing track"
        setShowBadge(false)
      }
      (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
        .createNotificationChannel(channel)
    }
  }

  private fun postChip(a: NowPlayingArgs) {
    val pct = (a.progress.coerceIn(0.0, 1.0) * 100).toInt()

    val builder = NotificationCompat.Builder(context, channelId)
      .setSmallIcon(android.R.drawable.ic_media_play) // TODO: swap for a branded monochrome icon
      .setContentTitle(a.title)
      .setContentText("${a.artist} • ${a.position} / ${a.duration}")
      .setOngoing(a.isPlaying)
      .setOnlyAlertOnce(true)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      // Classic determinate progress bar. (NotificationCompat.ProgressStyle and
      // setShortCriticalText from the Android 16 APIs don't resolve against the
      // androidx.core that actually lands in this build, so we use the long-stable
      // setProgress + request promotion to a Live Update instead.)
      .setProgress(100, pct, false)
      // Request promotion to a Live Update (system may decline / rate-limit).
      .setRequestPromotedOngoing(true)

    NotificationManagerCompat.from(context).notify(notifId, builder.build())
  }
}
