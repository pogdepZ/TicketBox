/**
 * Scan Check-in DTO
 * Request body for POST /checkin/scan
 */
export class ScanCheckinDto {
  qrCodeData: string;
  staffId: string;
  concertId: string;
}
