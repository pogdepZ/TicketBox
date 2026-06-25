import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ConcertService } from "./concert.service";
import { CreateConcertDto } from "./dto/create-concert.dto";
import { UpdateConcertDto } from "./dto/update-concert.dto";
import { QueryConcertDto } from "./dto/query-concert.dto";
import { CancelConcertDto } from "./dto/cancel-concert.dto";
import { CreateTicketTypeDto } from "./dto/create-ticket-type.dto";
import { UpdateTicketTypeDto } from "./dto/update-ticket-type.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/dto/user-response.dto";
import { JwtAuthGuard } from "../auth/guard/jwt-auth.guard";
import { PermissionGuard } from "../auth/guard/permission.guard";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { UploadedFileDto } from "./dto/uploaded-file.dto";

@Controller("concerts")
export class ConcertController {
  constructor(private readonly concertService: ConcertService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions("concert:create")
  create(
    @Body() createConcertDto: CreateConcertDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.concertService.create(createConcertDto, user?.id);
  }

  @Post(":id/seat-map-svg")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions("ticket_type:manage")
  @UseInterceptors(FileInterceptor("file"))
  uploadSeatMapSvg(
    @Param("id") id: string,
    @UploadedFile() seatMapSvgFile?: UploadedFileDto,
  ) {
    return this.concertService.uploadSeatMapSvg(id, seatMapSvgFile);
  }

  @Get()
  findAll(@Query() query: QueryConcertDto) {
    return this.concertService.findAll(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.concertService.findOne(id);
  }

  @Get(":id/reserved-seats")
  getReservedSeats(@Param("id") id: string) {
    return this.concertService.getReservedSeats(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions("concert:update")
  update(@Param("id") id: string, @Body() updateConcertDto: UpdateConcertDto) {
    return this.concertService.update(id, updateConcertDto);
  }

  @Patch(":id/publish")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions("concert:update")
  publish(@Param("id") id: string) {
    return this.concertService.publish(id);
  }

  @Patch(":id/cancel")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions("concert:cancel")
  cancel(
    @Param("id") id: string,
    @Body() cancelConcertDto: CancelConcertDto = new CancelConcertDto(),
  ) {
    return this.concertService.cancel(id, cancelConcertDto);
  }

  @Patch(":id/complete")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions("concert:update")
  complete(@Param("id") id: string) {
    return this.concertService.complete(id);
  }

  @Post(":concertId/ticket-types")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions("ticket_type:manage")
  createTicketType(
    @Param("concertId") concertId: string,
    @Body() dto: CreateTicketTypeDto,
  ) {
    return this.concertService.createTicketType(concertId, dto);
  }

  @Patch(":concertId/ticket-types/:id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions("ticket_type:manage")
  updateTicketType(
    @Param("concertId") concertId: string,
    @Param("id") id: string,
    @Body() dto: UpdateTicketTypeDto,
  ) {
    return this.concertService.updateTicketType(concertId, id, dto);
  }

  @Delete(":concertId/ticket-types/:id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions("ticket_type:manage")
  deleteTicketType(
    @Param("concertId") concertId: string,
    @Param("id") id: string,
  ) {
    return this.concertService.deleteTicketType(concertId, id);
  }
}
