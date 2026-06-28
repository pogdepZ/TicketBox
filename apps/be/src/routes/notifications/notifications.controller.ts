import { Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthUser } from '../auth/dto/user-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getNotifications(@CurrentUser() user: AuthUser) {
    return this.notificationsService.getInAppNotifications(user.id);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  async markRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.notificationsService.markInAppNotificationAsRead(id, user.id);
  }

  @Post('read-all')
  @UseGuards(JwtAuthGuard)
  async readAll(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllInAppNotificationsAsRead(user.id);
  }

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
