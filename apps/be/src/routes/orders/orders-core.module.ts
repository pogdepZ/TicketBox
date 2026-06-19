import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { IdempotencyService } from './idempotency.service';
import { OrderTransactionHelper } from './order-transaction.helper';
import { TicketInventoryService } from './ticket-inventory.service';

@Module({
  imports: [PrismaModule],
  providers: [
    IdempotencyService,
    TicketInventoryService,
    OrderTransactionHelper,
  ],
  exports: [
    IdempotencyService,
    TicketInventoryService,
    OrderTransactionHelper,
  ],
})
export class OrdersCoreModule {}
