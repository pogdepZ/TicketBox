import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OutboxService } from './outbox.service';

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'notification' },
      { name: 'ai' },
      { name: 'csv' },
    ),
  ],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}

