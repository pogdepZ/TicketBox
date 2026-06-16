/**
 * API Configuration
 * TicketBox Check-in Mobile App
 */

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

export const API_TIMEOUT = 10_000; // 10 seconds

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
  },
  CHECKIN: {
    SCAN: '/checkin/scan',
    SYNC: '/checkin/sync',
  },
} as const;
