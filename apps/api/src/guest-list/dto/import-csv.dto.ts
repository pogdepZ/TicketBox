/**
 * Import CSV DTO
 * Request body for POST /admin/concerts/:id/guest-list/import
 * Note: Actual file is received via multipart/form-data
 * CSV Format: name, email, phone, ticketType, sponsorName
 */
export class ImportCsvDto {
  // File will be handled by NestJS FileInterceptor
  concertId?: string;
}
