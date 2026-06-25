/**
 * Type Definitions
 * TicketBox Check-in Mobile App
 */

/** Standard API response format */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

/** Check-in scan result status */
export type ScanStatus = 'SUCCESS' | 'DUPLICATE' | 'NOT_FOUND' | 'WRONG_EVENT' | 'WRONG_ZONE' | 'TEMP_ACCEPTED' | 'ACCEPTED_GUEST' | 'DUPLICATE_GUEST' | 'INVALID_GUEST';

/** Sync status for offline queue items */
export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT' | 'REJECTED';

/** User role */
export type UserRole = 'CHECKIN_STAFF' | 'ADMIN' | 'ORGANIZER';

/** Mock ticket data */
export interface TicketInfo {
  ticketId: string;
  guestName: string;
  ticketType: string;
  ticketCode: string;
  seat?: string;
  concertName: string;
  checkedInAt: string;
  status: ScanStatus;
}

/** Offline queue item */
export interface OfflineQueueItem {
  id: string;
  ticketId: string;
  ticketCode: string;
  qrCodeData: string;
  concertId: string;
  staffId: string;
  sourceDeviceId: string;
  checkedAt: string;
  syncStatus: SyncStatus;
  syncAttempts: number;
  lastSyncError: string | null;
  serverCheckinId: string | null;
  createdAt: string;
}

/** Sync history record */
export interface SyncHistoryRecord {
  id: string;
  syncedAt: string;
  recordCount: number;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  errorMessage?: string;
}

/** Auth user */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  token: string;
}

/** Check-in scan request */
export interface ScanRequest {
  qrCodeData: string;
  staffId: string;
  concertId: string;
}

/** Check-in scan response */
export interface ScanResponse {
  ticketId: string;
  status: ScanStatus;
  checkedInAt: string;
}

/** Sync request item */
export interface SyncRequestItem {
  ticketId: string;
  qrCodeData: string;
  concertId: string;
  staffId: string;
  sourceDeviceId: string;
  checkedAt: string;
}

/** Sync result item */
export interface SyncResultItem {
  ticketId: string;
  status: SyncStatus;
  serverId: string;
}

/** Snapshot response */
export interface SnapshotResponse {
  version: string;
  publicKey: string;
  tickets: {
    id: string;
    ticketCode: string;
    status: string;
    guestName: string;
    ticketType: string;
  }[];
  guests: {
    id: string;
    guestCode: string;
    fullName: string;
    email: string | null;
    status: string;
  }[];
}

/** Concert */
export interface Concert {
  id: string;
  name: string;
  eventDate: string;
  venueName: string;
  posterUrl: string | null;
}

/** Navigation params */
export type RootStackParamList = {
  Login: undefined;
  EventSelector: undefined;
  Scanner: undefined;
  Result: { ticket: TicketInfo; isOffline: boolean };
  OfflineQueue: undefined;
  SyncHistory: undefined;
  Settings: undefined;
  Snapshot: undefined;
};
