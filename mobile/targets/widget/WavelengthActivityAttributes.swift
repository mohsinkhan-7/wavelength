import ActivityKit

// Shared data contract for the "Now Playing" Live Activity.
//
// ⚠️ IMPORTANT: this exact type must be compiled into BOTH the widget extension
// target AND the main app target (which the native module lives in). After
// `expo prebuild`, open Xcode and add this file to the app target's
// "Target Membership" as well. ActivityKit links the running activity to the
// widget by this attributes type — it must be the same type in both targets.
struct WavelengthActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var title: String
    var artist: String
    var isPlaying: Bool
    var progress: Double // 0.0 ... 1.0
    var position: String // e.g. "1:23"
    var duration: String // e.g. "3:45"
  }
}
