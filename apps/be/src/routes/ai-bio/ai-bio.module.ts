import { Module } from '@nestjs/common';
import { AiBioController } from './ai-bio.controller';
import { AiBioService } from './ai-bio.service';

@Module({
  controllers: [AiBioController],
  providers: [AiBioService],
  exports: [AiBioService],
})
export class AiBioModule {}
