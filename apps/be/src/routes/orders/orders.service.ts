import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { randomUUID } from 'crypto';

type MockOrderItem = {
  ticketTypeId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

@Injectable()
export class OrdersService {
  createMockOrder(dto: CreateOrderDto, idempotencyKey?: string) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    const items: MockOrderItem[] = dto.items.map((item, index) => {
      const unitPrice = this.getMockUnitPrice(index);

      return {
        ticketTypeId: item.ticketTypeId,
        name: this.getMockTicketName(index),
        quantity: item.quantity,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
      };
    });

    const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);

    return {
      success: true,
      data: {
        orderId: randomUUID(),
        concertId: dto.concertId,
        status: 'PENDING_PAYMENT',
        totalAmount,
        currency: 'VND',
        expiresAt: expiresAt.toISOString(),
        idempotencyKey: idempotencyKey ?? null,
        mockUserId: 'mock-audience-user',
        items,
      },
      message: 'Mock order created',
    };
  }

  private getMockUnitPrice(index: number): number {
    const prices = [1800000, 1200000, 900000, 650000, 450000];

    return prices[index] ?? 500000;
  }

  private getMockTicketName(index: number): string {
    const names = ['SVIP', 'VIP', 'CAT1', 'CAT2', 'GA'];

    return names[index] ?? `TICKET_${index + 1}`;
  }
}
