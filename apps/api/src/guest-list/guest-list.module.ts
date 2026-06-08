import { Module } from '@nestjs/common';
import { GuestListController } from './guest-list.controller';
import { GuestListService } from './guest-list.service';

@Module({
  controllers: [GuestListController],
  providers: [GuestListService],
  exports: [GuestListService],
})
export class GuestListModule {}
