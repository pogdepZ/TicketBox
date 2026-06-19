import { Module } from '@nestjs/common';
import { AiBioController } from './ai-bio.controller';
import { AiBioService } from './ai-bio.service';
import { BullModule } from '@nestjs/bullmq';
import { AiBioProcessor } from './ai-bio.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ai',
    }),
  ],
  controllers: [AiBioController],
  providers: [AiBioService, AiBioProcessor],
  exports: [AiBioService],
})
export class AiBioModule {}
