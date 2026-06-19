import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { SharedModule } from './shared.module';
import { AiBioModule } from './routes/ai-bio/ai-bio.module';
import { AuthModule } from './routes/auth/auth.module';
import { CheckinModule } from './routes/checkin/checkin.module';
import { ConcertModule } from './routes/concert/concert.module';
import { GuestListModule } from './routes/guest-list/guest-list.module';
import { NotificationsModule } from './routes/notifications/notifications.module';
import { OrdersModule } from './routes/orders/orders.module';
import { PaymentsModule } from './routes/payments/payments.module';
import { TicketsModule } from './routes/tickets/tickets.module';

@Module({
  imports: [
    SharedModule,
    ConcertModule,
    AuthModule,
    OrdersModule,
    PaymentsModule,
    TicketsModule,
    CheckinModule,
    NotificationsModule,
    AiBioModule,
    GuestListModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: AppZodValidationPipe,
    },
  ],
})
export class ApiModule {}
