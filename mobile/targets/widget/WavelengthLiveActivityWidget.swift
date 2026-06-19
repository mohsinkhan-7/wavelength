import ActivityKit
import WidgetKit
import SwiftUI

// Brand accent (matches the app's #8B6CFF).
private let brand = Color(red: 0.545, green: 0.424, blue: 1.0)

@available(iOS 16.2, *)
struct WavelengthLiveActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: WavelengthActivityAttributes.self) { context in
      // ── Lock screen / banner presentation ──
      LockScreenView(state: context.state)
        .padding(14)
        .activityBackgroundTint(Color.black.opacity(0.85))
        .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      DynamicIsland {
        // ── Expanded presentation ──
        DynamicIslandExpandedRegion(.leading) {
          Image(systemName: "music.note")
            .font(.title2)
            .foregroundColor(brand)
            .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Image(systemName: context.state.isPlaying ? "waveform" : "pause.fill")
            .font(.title3)
            .foregroundColor(brand)
            .padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.center) {
          VStack(spacing: 2) {
            Text(context.state.title)
              .font(.headline)
              .lineLimit(1)
            Text(context.state.artist)
              .font(.caption)
              .foregroundColor(.secondary)
              .lineLimit(1)
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(spacing: 4) {
            ProgressView(value: context.state.progress)
              .tint(brand)
            HStack {
              Text(context.state.position).font(.caption2).foregroundColor(.secondary)
              Spacer()
              Text(context.state.duration).font(.caption2).foregroundColor(.secondary)
            }
          }
        }
      } compactLeading: {
        Image(systemName: "music.note").foregroundColor(brand)
      } compactTrailing: {
        Image(systemName: context.state.isPlaying ? "waveform" : "pause.fill")
          .foregroundColor(brand)
      } minimal: {
        Image(systemName: "music.note").foregroundColor(brand)
      }
      .widgetURL(URL(string: "wavelength://player"))
      .keylineTint(brand)
    }
  }
}

@available(iOS 16.2, *)
private struct LockScreenView: View {
  let state: WavelengthActivityAttributes.ContentState

  var body: some View {
    HStack(spacing: 12) {
      ZStack {
        RoundedRectangle(cornerRadius: 10).fill(brand.opacity(0.25))
        Image(systemName: "music.note").foregroundColor(brand).font(.title2)
      }
      .frame(width: 48, height: 48)

      VStack(alignment: .leading, spacing: 4) {
        Text(state.title).font(.headline).lineLimit(1)
        Text(state.artist).font(.subheadline).foregroundColor(.secondary).lineLimit(1)
        ProgressView(value: state.progress).tint(brand)
      }

      Image(systemName: state.isPlaying ? "waveform" : "pause.fill")
        .foregroundColor(brand)
        .font(.title3)
    }
  }
}
