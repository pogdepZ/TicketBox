import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TicketsModule } from '../tickets/tickets.module';
import { RolesGuard } from '../auth/guard/roles.guard';
import { OrdersCoreModule } from './orders-core.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,  // exports JwtAuthGuard, RolesGuard via Reflector
    TicketsModule,
    OrdersCoreModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    RolesGuard,
  ],
  exports: [OrdersService, OrdersCoreModule],
})
export class OrdersModule {}
