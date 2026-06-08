import { Controller } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // No endpoints for Week 1
  // Notifications are triggered internally by other services
}
