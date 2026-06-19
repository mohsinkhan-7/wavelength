import ActivityKit
import ExpoModulesCore

// Arguments passed from JS for the Now Playing state.
struct NowPlayingArgs: Record {
  @Field var title: String = ""
  @Field var artist: String = ""
  @Field var isPlaying: Bool = true
  @Field var progress: Double = 0
  @Field var position: String = "0:00"
  @Field var duration: String = "0:00"
}

public class WavelengthLiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WavelengthLiveActivity")

    // Whether the device supports Live Activities and the user has them enabled.
    Function("isSupported") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    // Start a new Now Playing activity. Resolves with { id } or nil.
    AsyncFunction("startActivity") { (args: NowPlayingArgs, promise: Promise) in
      guard #available(iOS 16.2, *), ActivityAuthorizationInfo().areActivitiesEnabled else {
        promise.resolve(nil)
        return
      }
      let state = Self.stateFrom(args)
      do {
        let activity = try Activity.request(
          attributes: WavelengthActivityAttributes(),
          content: ActivityContent(state: state, staleDate: nil)
        )
        promise.resolve(["id": activity.id])
      } catch {
        promise.resolve(nil)
      }
    }

    // Update an existing activity by id.
    AsyncFunction("updateActivity") { (id: String, args: NowPlayingArgs, promise: Promise) in
      guard #available(iOS 16.2, *) else {
        promise.resolve(false)
        return
      }
      Task {
        if let activity = Activity<WavelengthActivityAttributes>.activities.first(where: { $0.id == id }) {
          await activity.update(ActivityContent(state: Self.stateFrom(args), staleDate: nil))
        }
        promise.resolve(true)
      }
    }

    // End an activity by id (or all, if id is empty).
    AsyncFunction("endActivity") { (id: String, promise: Promise) in
      guard #available(iOS 16.2, *) else {
        promise.resolve(false)
        return
      }
      Task {
        for activity in Activity<WavelengthActivityAttributes>.activities where id.isEmpty || activity.id == id {
          await activity.end(nil, dismissalPolicy: .immediate)
        }
        promise.resolve(true)
      }
    }
  }

  @available(iOS 16.2, *)
  private static func stateFrom(_ args: NowPlayingArgs) -> WavelengthActivityAttributes.ContentState {
    WavelengthActivityAttributes.ContentState(
      title: args.title,
      artist: args.artist,
      isPlaying: args.isPlaying,
      progress: max(0, min(1, args.progress)),
      position: args.position,
      duration: args.duration
    )
  }
}
