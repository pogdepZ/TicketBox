import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createMockOrder(dto: CreateOrderDto, idempotencyKey?: string) {
    // 1. Create a dummy user if not exists
    let user = await this.prisma.user.findFirst({ where: { email: 'dummy@ticketbox.com' } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: 'dummy@ticketbox.com',
          fullName: 'Khách hàng Demo',
          phone: '0123456789'
        }
      });
    }

    // 2. Validate ticket types exist
    const ticketTypeId = dto.items[0].ticketTypeId;
    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id: ticketTypeId }
    });
    
    if (!ticketType) {
      throw new BadRequestException('Ticket Type không tồn tại trong DB');
    }

    const totalAmount = ticketType.price.toNumber() * dto.items[0].quantity;

    // 3. Create a dummy reservation
    const reservation = await this.prisma.reservation.create({
      data: {
        userId: user.id,
        concertId: dto.concertId,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        status: 'CONFIRMED',
        items: {
          create: {
            ticketTypeId: ticketTypeId,
            quantity: dto.items[0].quantity,
            unitPrice: ticketType.price
          }
        }
      }
    });

    // 4. Create the Order
    const order = await this.prisma.order.create({
      data: {
        userId: user.id,
        concertId: dto.concertId,
        reservationId: reservation.id,
        idempotencyKey: idempotencyKey ?? randomUUID(),
        status: 'PENDING_PAYMENT',
        totalAmount: totalAmount,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        items: {
          create: {
            ticketTypeId: ticketTypeId,
            quantity: dto.items[0].quantity,
            unitPrice: ticketType.price
          }
        }
      }
    });

    return {
      success: true,
      data: {
        orderId: order.id,
        status: order.status,
        totalAmount: totalAmount
      },
      message: 'Order created successfully in DB',
    };
  }
}
