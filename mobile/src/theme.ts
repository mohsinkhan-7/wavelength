// Central design tokens for the "Wavelength" glassmorphism theme.
export const colors = {
  // Base
  bg: '#07060D',
  bgElevated: '#0E0C18',
  text: '#F6F5FB',
  textMuted: '#A6A3B8',
  textFaint: '#6E6B82',

  // Brand
  primary: '#8B6CFF',
  primaryDark: '#5B3FD6',
  accent: '#21D4C9',
  like: '#FF4D7D',
  danger: '#FF5C77',
  white: '#FFFFFF',

  // Glass surfaces (translucent — sit over the gradient backdrop)
  glass: 'rgba(255,255,255,0.06)',
  glassStrong: 'rgba(255,255,255,0.10)',
  glassBorder: 'rgba(255,255,255,0.14)',
  glassBorderSoft: 'rgba(255,255,255,0.08)',
  hairline: 'rgba(255,255,255,0.07)',

  // Ambient gradient blobs behind the glass
  glowViolet: 'rgba(124,92,255,0.55)',
  glowTeal: 'rgba(33,212,201,0.30)',
  glowPink: 'rgba(255,77,125,0.28)',
};

// Gradient stops used by LinearGradient.
export const gradients = {
  brand: ['#8B6CFF', '#5B3FD6'] as const,
  brandHot: ['#A66BFF', '#6A3FE0', '#21D4C9'] as const,
  sheen: ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.02)'] as const,
  playerBackdrop: ['#241a44', '#120e22', '#07060D'] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const font = {
  title: 30,
  heading: 21,
  body: 15,
  small: 13,
  tiny: 11,
};

// Font families (loaded in the root layout). Display = Space Grotesk for big
// headings; body weights = Inter, applied globally + weight-aware via the Text
// patch in lib/textFont.ts.
export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  displaySemi: 'SpaceGrotesk_600SemiBold',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

// Reusable soft shadow for elevated glass cards.
export const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.35,
  shadowRadius: 20,
  elevation: 8,
};
