import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsProcessor } from './notifications.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notification',
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
