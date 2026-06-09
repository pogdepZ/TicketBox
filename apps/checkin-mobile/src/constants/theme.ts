/**
 * Theme Configuration
 * TicketBox Check-in Mobile App
 */

export const COLORS = {
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#4A3DB8',

  success: '#00B894',
  successLight: '#55EFC4',
  successDark: '#009B7D',

  error: '#E74C3C',
  errorLight: '#FF7675',
  errorDark: '#C0392B',

  warning: '#FDCB6E',
  warningLight: '#FFEAA7',
  warningDark: '#E17055',

  info: '#74B9FF',

  background: '#0F0F23',
  backgroundSecondary: '#1A1A2E',
  surface: '#16213E',
  surfaceLight: '#1E2D4D',

  text: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textMuted: '#6C6C80',

  border: '#2A2A3E',
  borderLight: '#3A3A5E',

  online: '#00B894',
  offline: '#E74C3C',
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
} as const;

export const BORDER_RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  round: 9999,
} as const;
