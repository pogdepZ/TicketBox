import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentEventService } from './payment-event.service';
import { PaymentCircuitBreakerService } from './payment-circuit-breaker.service';
import { IdempotencyService } from '../orders/idempotency.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';
import { TicketsModule } from '../tickets/tickets.module';
import { RolesGuard } from '../auth/guard/roles.guard';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    OrdersModule,   // exports OrderTransactionHelper
    TicketsModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentGatewayService,
    PaymentEventService,
    PaymentCircuitBreakerService,
    IdempotencyService,   // instance riêng cho payments
    RolesGuard,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
