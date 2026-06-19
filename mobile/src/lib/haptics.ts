import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Thin haptics wrapper — no-ops on web, never throws.
const native = Platform.OS === 'ios' || Platform.OS === 'android';

export function tapLight() {
  if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function tapMedium() {
  if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function tapSelection() {
  if (native) Haptics.selectionAsync().catch(() => {});
}
