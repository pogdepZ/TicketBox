import { Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthModule } from "../auth/auth.module";
import { PermissionGuard } from "../auth/guard/permission.guard";
import { TicketsController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";
import { PrismaModule } from "../../common/prisma/prisma.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TicketsController],
  providers: [TicketsService, PermissionGuard, Reflector],
  exports: [TicketsService],
})
export class TicketsModule {}
