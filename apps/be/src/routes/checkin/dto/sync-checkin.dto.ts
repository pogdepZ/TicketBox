export class SyncCheckinItemDto {
  ticketId!: string;
  qrCodeData!: string;
  concertId!: string;
  staffId!: string;
  sourceDeviceId!: string;
  checkedAt!: string;
  clientEventId!: string;
  gate?: string;
}

export class SyncCheckinDto {
  items!: SyncCheckinItemDto[];
}
