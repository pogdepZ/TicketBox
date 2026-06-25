import { Body, Controller, Post, UseGuards, Get, Param } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { ScanCheckinDto } from './dto/scan-checkin.dto';
import { SyncCheckinDto } from './dto/sync-checkin.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/dto/user-response.dto';

@Controller('checkin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) { }

  @Post('scan')
  @Roles('checker', 'admin')
  async scan(@Body() dto: ScanCheckinDto, @CurrentUser() user: AuthUser) {
    dto.staffId = user.id; // Override staffId for security
    return this.checkinService.scan(dto);
  }

  @Post('sync')
  @Roles('checker', 'admin')
  async sync(@Body() dto: SyncCheckinDto, @CurrentUser() user: AuthUser) {
    // For sync, we might trust the array of items' staffIds or override them.
    // Given the task, we just secure the endpoint.
    return this.checkinService.sync(dto);
  }

  @Get('events/:concertId/snapshot')
  @Roles('checker', 'admin')
  async getSnapshot(@Param('concertId') concertId: string) {
    return this.checkinService.getSnapshot(concertId);
  }
}
