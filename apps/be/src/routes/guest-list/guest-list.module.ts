import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { GuestListController } from './guest-list.controller';
import { GuestListService } from './guest-list.service';
import { S3Module } from '../../common/s3/s3.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'csv',
    }),
    S3Module,
  ],
  controllers: [GuestListController],
  providers: [GuestListService],
  exports: [GuestListService],
})
export class GuestListModule {}
