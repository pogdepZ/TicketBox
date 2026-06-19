import { Module } from '@nestjs/common';
import { GuestListController } from './guest-list.controller';
import { GuestListService } from './guest-list.service';
import { BullModule } from '@nestjs/bullmq';
import { GuestListProcessor } from './guest-list.processor';

const runWorker = process.env.APP_MODE === 'worker' || process.env.APP_MODE === 'all' || !process.env.APP_MODE;
const runApi = process.env.APP_MODE === 'api' || process.env.APP_MODE === 'all' || !process.env.APP_MODE;

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'csv',
    }),
  ],
  controllers: runApi ? [GuestListController] : [],
  providers: [
    GuestListService,
    ...(runWorker ? [GuestListProcessor] : []),
  ],
  exports: [GuestListService],
})
export class GuestListModule {}
