import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { IdempotencyService } from './idempotency.service';
import { TicketInventoryService } from './ticket-inventory.service';
import { OrderTransactionHelper } from './order-transaction.helper';
import { OrderExpirationJob } from './order-expiration.job';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TicketsModule } from '../tickets/tickets.module';
import { RolesGuard } from '../auth/guard/roles.guard';

@Module({
  imports: [
    PrismaModule,
    AuthModule,  // exports JwtAuthGuard, RolesGuard via Reflector
    TicketsModule,  
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    IdempotencyService,
    TicketInventoryService,
    OrderTransactionHelper,
    OrderExpirationJob,
    RolesGuard,
    Reflector,
  ],
  exports: [OrdersService, OrderTransactionHelper],
})
export class OrdersModule {}
