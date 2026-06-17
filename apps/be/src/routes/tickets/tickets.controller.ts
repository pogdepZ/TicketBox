import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { TicketsService } from "./tickets.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/dto/user-response.dto";
import { JwtAuthGuard } from "../auth/guard/jwt-auth.guard";
import { PermissionGuard } from "../auth/guard/permission.guard";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { OrderIdParamDto, TicketIdParamDto } from "./dto/ticket-params.dto";
import { VerifyTicketDto } from "./dto/verify-ticket.dto";

@Controller("tickets")
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get("me")
  async getMyTickets(@CurrentUser() user: AuthUser) {
    const items = await this.ticketsService.getTicketsForUser(user);

    return {
      success: true,
      data: { items },
    };
  }

  @Get("orders/:orderId")
  async getTicketsByOrder(
    @Param() params: OrderIdParamDto,
    @CurrentUser() user: AuthUser,
  ) {
    const items = await this.ticketsService.getTicketsByOrderIdForUser(
      params.orderId,
      user,
    );

    return {
      success: true,
      data: { items },
    };
  }

  @Get(":id")
  async getTicket(
    @Param() params: TicketIdParamDto,
    @CurrentUser() user: AuthUser,
  ) {
    const ticket = await this.ticketsService.getTicketById(params.id, user);

    return {
      success: true,
      data: ticket,
    };
  }

  @Post("verify")
  @UseGuards(PermissionGuard)
  @RequirePermissions("ticket:verify")
  async verify(@Body() body: VerifyTicketDto) {
    const result = await this.ticketsService.verifyTicketQr(body.qrPayload);

    return {
      success: true,
      data: result,
    };
  }
}
