import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CheckinModule } from './checkin/checkin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiBioModule } from './ai-bio/ai-bio.module';
import { GuestListModule } from './guest-list/guest-list.module';

@Module({
  imports: [
    CheckinModule,
    NotificationsModule,
    AiBioModule,
    GuestListModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
