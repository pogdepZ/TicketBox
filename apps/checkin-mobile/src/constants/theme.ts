/**
 * Theme Configuration
 * TicketBox Check-in Mobile App
 */

export const COLORS = {
  primary: '#34d399', // emerald-400
  primaryLight: '#6ee7b7', // emerald-300
  primaryDark: '#059669', // emerald-600

  success: '#34d399', // emerald-400
  successLight: '#6ee7b7',
  successDark: '#059669',

  error: '#f87171', // red-400
  errorLight: '#fca5a5',
  errorDark: '#dc2626',

  warning: '#fbbf24', // amber-400
  warningLight: '#fcd34d',
  warningDark: '#d97706',

  info: '#38bdf8', // sky-400

  background: '#080808', // pure dark
  backgroundSecondary: '#141414', // secondary dark
  surface: '#18181b', // zinc-900 / card
  surfaceLight: '#27272a', // zinc-800
  surfaceRaised: '#27272a',

  text: '#ffffff', // pure white foreground
  textSecondary: '#d4d4d8', // zinc-300
  textMuted: '#a1a1aa', // zinc-400

  border: 'rgba(255, 255, 255, 0.15)', // transparent border
  borderLight: 'rgba(255, 255, 255, 0.08)',

  online: '#34d399',
  offline: '#f87171',
} as const;

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
  title: 34,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  massive: 64,
} as const;

export const BORDER_RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  round: 9999,
} as const;
