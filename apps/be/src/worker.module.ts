import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AiBioProcessor } from './routes/ai-bio/ai-bio.processor';
import { GuestListProcessor } from './routes/guest-list/guest-list.processor';
import { NotificationsProcessor } from './routes/notifications/notifications.processor';
import { OrderExpirationJob } from './routes/orders/order-expiration.job';
import { OrdersCoreModule } from './routes/orders/orders-core.module';
import { SharedModule } from './shared.module';

@Module({
  imports: [
    SharedModule,
    ScheduleModule.forRoot(),
    OrdersCoreModule,
    BullModule.registerQueue(
      { name: 'notification' },
      { name: 'ai' },
      { name: 'csv' },
    ),
  ],
  providers: [
    OrderExpirationJob,
    NotificationsProcessor,
    AiBioProcessor,
    GuestListProcessor,
  ],
})
export class WorkerModule {}
