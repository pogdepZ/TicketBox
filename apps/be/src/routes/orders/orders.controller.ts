import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
  Headers,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AuthUser } from '../auth/dto/user-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * POST /orders
   * Chỉ customer mới được tạo order.
   * Bắt buộc header Idempotency-Key.
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('customer')
  async create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res() res: Response,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key is required');
    }

    const result = await this.ordersService.createOrder(user, dto, idempotencyKey);

    return res.status(result.status).json({
      success: true,
      data: result.body,
    });
  }

  /**
   * GET /orders/:id
   * Owner hoặc admin.
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    const order = await this.ordersService.getOrder(id, user);
    return {
      success: true,
      data: order,
    };
  }

  /**
   * POST /orders/:id/cancel
   * Chỉ owner của order mới được cancel.
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    const order = await this.ordersService.cancelOrder(id, user.id);
    return {
      success: true,
      data: order,
      message: 'Order cancelled successfully',
    };
  }
}
