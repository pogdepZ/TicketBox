import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AiBioController } from './ai-bio.controller';
import { AiBioService } from './ai-bio.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ai',
    }),
  ],
  controllers: [AiBioController],
  providers: [AiBioService],
  exports: [AiBioService],
})
export class AiBioModule {}
