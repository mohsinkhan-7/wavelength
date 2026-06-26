package expo.modules.liveactivity

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import androidx.media.app.NotificationCompat.MediaStyle
import androidx.media.session.MediaButtonReceiver
import java.net.URL
import java.util.concurrent.Executors

/**
 * Foreground service that owns the app's media notification on Android. It hosts
 * a MediaSessionCompat (so the lock screen, notification shade and Bluetooth /
 * headset buttons all bind to it) and posts a MediaStyle notification with real
 * prev / play-pause / next controls plus a seek bar and artwork.
 *
 * The service holds no playback engine of its own — expo-audio owns the actual
 * ExoPlayer. Transport-control taps are forwarded to JS via
 * [WavelengthLiveActivityModule.emitAction]; JS mutates the player store, which
 * pushes fresh state straight back here. A partial wake lock is held while
 * playing so decoding survives screen-off without relying on expo-audio's own
 * (deactivated) lock-screen session.
 */
class MediaPlaybackService : android.app.Service() {

  private lateinit var session: MediaSessionCompat
  private lateinit var notificationManager: NotificationManagerCompat
  private var wakeLock: PowerManager.WakeLock? = null

  private val mainHandler = Handler(Looper.getMainLooper())
  private val artworkExecutor = Executors.newSingleThreadExecutor()

  // Artwork cache so progress ticks don't re-download the same image.
  private var artworkUrl: String? = null
  private var artworkBitmap: Bitmap? = null

  override fun onCreate() {
    super.onCreate()
    notificationManager = NotificationManagerCompat.from(this)
    ensureChannel()

    session = MediaSessionCompat(this, "WavelengthMediaSession").apply {
      setCallback(callback)
      setMediaButtonReceiver(
        MediaButtonReceiver.buildMediaButtonPendingIntent(
          this@MediaPlaybackService,
          PlaybackStateCompat.ACTION_PLAY_PAUSE
        )
      )
      isActive = true
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        stop()
        return START_NOT_STICKY
      }
      Intent.ACTION_MEDIA_BUTTON -> {
        // A button tap may arrive via PendingIntent.getForegroundService while
        // the service is detached (paused). Promote to foreground immediately so
        // we satisfy the startForeground() deadline, THEN route the key event.
        // The JS round-trip that follows will re-render with the new state.
        promoteForegroundForButton()
        MediaButtonReceiver.handleIntent(session, intent)
      }
      else -> render() // ACTION_START / ACTION_UPDATE (and restarts)
    }
    return START_STICKY
  }

  /** Re-read the shared state and (re)build session state + notification. */
  private fun render() {
    val data = NowPlayingStore.current ?: run { stop(); return }

    updateMetadata(data)
    updatePlaybackState(data)

    val notification = buildNotification(data)
    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
      ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK else 0
    ServiceCompat.startForeground(this, NOTIF_ID, notification, type)

    // Paused: allow the notification to be swiped away and drop the foreground
    // promotion, but keep the service alive so playback can resume.
    if (!data.isPlaying) {
      ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_DETACH)
    }

    updateWakeLock(data.isPlaying)
    loadArtworkIfNeeded(data)
  }

  private fun updateMetadata(data: NowPlayingData) {
    val builder = MediaMetadataCompat.Builder()
      .putString(MediaMetadataCompat.METADATA_KEY_TITLE, data.title)
      .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, data.artist)
      .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, data.durationMs)
    artworkBitmap?.let { builder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, it) }
    session.setMetadata(builder.build())
  }

  private fun updatePlaybackState(data: NowPlayingData) {
    var actions = PlaybackStateCompat.ACTION_PLAY_PAUSE or
      PlaybackStateCompat.ACTION_PLAY or
      PlaybackStateCompat.ACTION_PAUSE or
      PlaybackStateCompat.ACTION_SEEK_TO
    if (data.canNext) actions = actions or PlaybackStateCompat.ACTION_SKIP_TO_NEXT
    if (data.canPrev) actions = actions or PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS

    val state = if (data.isPlaying) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED
    // speed 1.0 while playing lets the system extrapolate the seek bar between
    // our throttled updates; 0.0 freezes it when paused.
    val speed = if (data.isPlaying) 1f else 0f
    session.setPlaybackState(
      PlaybackStateCompat.Builder()
        .setActions(actions)
        .setState(state, data.positionMs, speed)
        .build()
    )
  }

  private fun buildNotification(data: NowPlayingData): android.app.Notification {
    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_media_play) // TODO: branded monochrome icon
      .setContentTitle(data.title)
      .setContentText(data.artist)
      .setLargeIcon(artworkBitmap)
      .setContentIntent(contentPendingIntent())
      .setDeleteIntent(MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_STOP))
      .setOnlyAlertOnce(true)
      .setOngoing(data.isPlaying)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setCategory(NotificationCompat.CATEGORY_TRANSPORT)

    if (data.canPrev) {
      builder.addAction(
        android.R.drawable.ic_media_previous, "Previous",
        MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS)
      )
    }
    if (data.isPlaying) {
      builder.addAction(
        android.R.drawable.ic_media_pause, "Pause",
        MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_PAUSE)
      )
    } else {
      builder.addAction(
        android.R.drawable.ic_media_play, "Play",
        MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_PLAY)
      )
    }
    if (data.canNext) {
      builder.addAction(
        android.R.drawable.ic_media_next, "Next",
        MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_SKIP_TO_NEXT)
      )
    }

    // Show the play/pause action (index depends on whether Previous is present)
    // in the collapsed view.
    val playPauseIndex = if (data.canPrev) 1 else 0
    builder.setStyle(
      MediaStyle()
        .setMediaSession(session.sessionToken)
        .setShowActionsInCompactView(playPauseIndex)
    )
    return builder.build()
  }

  /** Promote to foreground using the current state, to satisfy the FGS deadline. */
  private fun promoteForegroundForButton() {
    val data = NowPlayingStore.current ?: return
    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
      ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK else 0
    ServiceCompat.startForeground(this, NOTIF_ID, buildNotification(data), type)
  }

  private fun contentPendingIntent(): PendingIntent? {
    val launch = packageManager.getLaunchIntentForPackage(packageName) ?: return null
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getActivity(this, 0, launch, flags)
  }

  private fun loadArtworkIfNeeded(data: NowPlayingData) {
    val url = data.artworkUrl
    if (url == null) {
      if (artworkBitmap != null) {
        artworkUrl = null
        artworkBitmap = null
        // re-render without artwork
        mainHandler.post { NowPlayingStore.current?.let { reRenderArtwork(it) } }
      }
      return
    }
    if (url == artworkUrl && artworkBitmap != null) return // already loaded

    artworkUrl = url
    artworkExecutor.execute {
      val bmp = try {
        URL(url).openStream().use { BitmapFactory.decodeStream(it) }
      } catch (_: Throwable) {
        null
      }
      mainHandler.post {
        // Ignore if the track changed while we were downloading.
        if (artworkUrl != url) return@post
        artworkBitmap = bmp
        NowPlayingStore.current?.let { reRenderArtwork(it) }
      }
    }
  }

  /** Re-apply metadata + notification once artwork resolves, without re-promoting. */
  private fun reRenderArtwork(data: NowPlayingData) {
    updateMetadata(data)
    if (notificationManager.areNotificationsEnabled()) {
      notificationManager.notify(NOTIF_ID, buildNotification(data))
    }
  }

  private fun updateWakeLock(playing: Boolean) {
    if (playing) {
      if (wakeLock == null) {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Wavelength:playback").apply {
          setReferenceCounted(false)
        }
      }
      // acquire() is called on every playing render (~every 2s), which refreshes
      // the safety timeout so it never expires mid-track. Non-reference-counted,
      // so repeated acquires are idempotent.
      wakeLock?.acquire(WAKELOCK_TIMEOUT_MS)
    } else {
      wakeLock?.let { if (it.isHeld) it.release() }
    }
  }

  private val callback = object : MediaSessionCompat.Callback() {
    override fun onPlay() = WavelengthLiveActivityModule.emitAction("play", null)
    override fun onPause() = WavelengthLiveActivityModule.emitAction("pause", null)
    override fun onSkipToNext() = WavelengthLiveActivityModule.emitAction("next", null)
    override fun onSkipToPrevious() = WavelengthLiveActivityModule.emitAction("prev", null)
    override fun onSeekTo(pos: Long) = WavelengthLiveActivityModule.emitAction("seek", pos / 1000.0)
    override fun onStop() = WavelengthLiveActivityModule.emitAction("pause", null)
  }

  private fun stop() {
    updateWakeLock(false)
    session.isActive = false
    session.release()
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL_ID, "Now Playing", NotificationManager.IMPORTANCE_LOW).apply {
        description = "Media controls for the currently playing track"
        setShowBadge(false)
        lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
      }
      (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
        .createNotificationChannel(channel)
    }
  }

  override fun onDestroy() {
    artworkExecutor.shutdownNow()
    wakeLock?.let { if (it.isHeld) it.release() }
    if (session.isActive) {
      session.isActive = false
      session.release()
    }
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  companion object {
    const val ACTION_START = "expo.modules.liveactivity.START"
    const val ACTION_UPDATE = "expo.modules.liveactivity.UPDATE"
    const val ACTION_STOP = "expo.modules.liveactivity.STOP"

    private const val CHANNEL_ID = "wavelength_now_playing"
    private const val NOTIF_ID = 47110815
    private const val WAKELOCK_TIMEOUT_MS = 30 * 60 * 1000L // safety cap; refreshed each tick
  }
}
