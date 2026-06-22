import { Module } from '@nestjs/common';
import { ConcertService } from './concert.service';
import { ConcertController } from './concert.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { S3Module } from '../../common/s3/s3.module';

@Module({
  imports: [PrismaModule, S3Module],
  controllers: [ConcertController],
  providers: [ConcertService],
})
export class ConcertModule {}
