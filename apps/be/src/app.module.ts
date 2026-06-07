import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { validate } from './config/env.validation';
import { AuthModule } from './routes/auth/auth.module';
import { ConcertModule } from './routes/concert/concert.module';
import jwtConfig from './config/jwt.config';
import databaseConfig from './config/database.config';
import { OrdersModule } from './routes/orders/orders.module';
import { PaymentsModule } from './routes/payments/payments.module';
import { TicketsModule } from './routes/tickets/tickets.module';
import { AppZodValidationPipe } from './common/pipes/zod-validation.pipe';
 
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      load: [databaseConfig, jwtConfig],
    }),
    PrismaModule,
    ConcertModule,
    AuthModule,
    OrdersModule,
    PaymentsModule,
    TicketsModule,
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
export class AppModule {}
