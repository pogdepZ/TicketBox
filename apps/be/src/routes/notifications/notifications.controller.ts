import { Controller, Get, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('test-single')
  async testSingle(
    @Query('userId') userId: string,
    @Query('type') type: string,
    @Query('channel') channel: string,
  ) {
    return this.notificationsService.sendNotification(
      userId || '70281e69-0d8c-4cc9-b1c8-357b617af5b6',
      type || 'WELCOME',
      channel || 'EMAIL',
      { text: 'Hello, this is a test single notification!' },
    );
  }

  @Get('test-bulk')
  async testBulk(@Query('concertId') concertId: string) {
    return this.notificationsService.sendBulkReminder(
      concertId || 'b2561ee7-007f-4221-93f0-197d665883c5',
    );
  }
}
