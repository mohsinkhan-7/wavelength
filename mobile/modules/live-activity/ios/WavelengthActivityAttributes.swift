import ActivityKit

// Shared data contract for the "Now Playing" Live Activity.
//
// This MUST be the exact same type (name + ContentState shape) as the copy in
// `targets/widget/WavelengthActivityAttributes.swift`. ActivityKit links a
// running activity to its widget UI by this attributes type, so both the main
// app target (this native module) and the widget extension target each need
// their own compiled copy.
//
// This copy lives inside the native module's `ios/` folder so the module's
// podspec (`source_files = "**/*.swift"`) always compiles it into the app
// target — no manual Xcode "Target Membership" step required after prebuild.
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
