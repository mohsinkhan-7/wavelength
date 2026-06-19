import WidgetKit
import SwiftUI

@main
struct WavelengthWidgetBundle: WidgetBundle {
  var body: some Widget {
    if #available(iOS 16.2, *) {
      WavelengthLiveActivityWidget()
    }
  }
}
