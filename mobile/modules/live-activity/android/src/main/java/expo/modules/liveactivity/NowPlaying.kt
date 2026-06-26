package expo.modules.liveactivity

/** Immutable snapshot of the current Now Playing state, pushed from JS. */
data class NowPlayingData(
  val title: String,
  val artist: String,
  val isPlaying: Boolean,
  val positionMs: Long,
  val durationMs: Long,
  val artworkUrl: String?,
  val canNext: Boolean,
  val canPrev: Boolean,
)

/**
 * Bridges the JS-driven module and the foreground service without serializing
 * everything through Intent extras. The module writes the latest state here, then
 * pings the service with a lightweight action so it re-reads and re-renders.
 */
object NowPlayingStore {
  @Volatile
  var current: NowPlayingData? = null
}
