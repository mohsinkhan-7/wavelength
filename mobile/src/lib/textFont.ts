import React from 'react';
import { StyleSheet, Text } from 'react-native';

// Globally route <Text> to the Inter family at the correct weight (so the whole
// app uses premium type without editing every StyleSheet). Any Text that sets an
// explicit fontFamily (e.g. the Space Grotesk display headings) is respected.
let patched = false;

export function patchTextFonts() {
  if (patched) return;
  const TextAny = Text as any;
  if (typeof TextAny.render !== 'function') return; // safety: only patch forwardRef Text
  patched = true;

  const orig = TextAny.render;
  TextAny.render = function patchedRender(...args: any[]) {
    const el = orig.apply(this, args);
    if (!el || !el.props) return el;
    const flat = StyleSheet.flatten(el.props.style) || {};
    if (flat.fontFamily) return el; // explicit family wins (display headings)

    const w = flat.fontWeight;
    const n = typeof w === 'string' ? parseInt(w, 10) : w;
    const family =
      w === 'bold' || (n && n >= 700)
        ? 'Inter_700Bold'
        : n === 600
        ? 'Inter_600SemiBold'
        : n === 500
        ? 'Inter_500Medium'
        : 'Inter_400Regular';

    return React.cloneElement(el, { style: [el.props.style, { fontFamily: family }] });
  };
}
