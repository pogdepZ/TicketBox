import { Controller, Post, Body } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { ScanCheckinDto } from './dto/scan-checkin.dto';
import { SyncCheckinDto } from './dto/sync-checkin.dto';

@Controller('checkin')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  /**
   * POST /checkin/scan
   * Req: { qrCodeData, staffId, concertId }
   * Res: { success, data: { ticketId, status, checkedInAt } }
   * Auth: Bearer JWT (Role: CHECKIN_STAFF)
   */
  @Post('scan')
  async scan(@Body() dto: ScanCheckinDto) {
    const data = await this.checkinService.scan(dto);
    return {
      success: true,
      data,
      message: 'Check-in processed successfully',
    };
  }

  /**
   * POST /checkin/sync
   * Req: { items: [{ ticketId, qrCodeData, concertId, staffId, sourceDeviceId, checkedAt }] }
   * Res: { success, data: { results: [{ ticketId, status, serverId }] } }
   * Auth: Bearer JWT (Role: CHECKIN_STAFF)
   */
  @Post('sync')
  async sync(@Body() dto: SyncCheckinDto) {
    const data = await this.checkinService.sync(dto);
    return {
      success: true,
      data,
      message: `Synced ${dto.items.length} check-in records`,
    };
  }
}
