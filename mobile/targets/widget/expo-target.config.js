/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = (config) => ({
  type: 'widget',
  name: 'WavelengthWidget',
  // ActivityKit powers Live Activities / Dynamic Island; SwiftUI draws them.
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit'],
  entitlements: {
    // Must match the app group declared on the main app (see app.json).
    'com.apple.security.application-groups': ['group.com.trufe.wavelength'],
  },
});
