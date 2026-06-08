/**
 * Sync Check-in DTO
 * Request body for POST /checkin/sync
 */

export class SyncCheckinItemDto {
  ticketId: string;
  qrCodeData: string;
  concertId: string;
  staffId: string;
  sourceDeviceId: string;
  checkedAt: string;
}

export class SyncCheckinDto {
  items: SyncCheckinItemDto[];
}
