export declare class SyncCheckinItemDto {
    ticketId: string;
    qrCodeData: string;
    concertId: string;
    staffId: string;
    sourceDeviceId: string;
    checkedAt: string;
}
export declare class SyncCheckinDto {
    items: SyncCheckinItemDto[];
}
