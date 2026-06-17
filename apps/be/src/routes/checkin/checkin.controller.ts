import { Body, Controller, Post } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { ScanCheckinDto } from './dto/scan-checkin.dto';
import { SyncCheckinDto } from './dto/sync-checkin.dto';

@Controller('checkin')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Post('scan')
  async scan(@Body() dto: ScanCheckinDto) {
    return this.checkinService.scan(dto);
  }

  @Post('sync')
  async sync(@Body() dto: SyncCheckinDto) {
    return this.checkinService.sync(dto);
  }
}
