/**
 * Upload PDF DTO
 * Request body for POST /admin/concerts/:id/artist-bio/upload
 * Note: Actual file is received via multipart/form-data
 */
export class UploadPdfDto {
  // File will be handled by NestJS FileInterceptor
  // This DTO is for any additional form fields
  concertId?: string;
}
