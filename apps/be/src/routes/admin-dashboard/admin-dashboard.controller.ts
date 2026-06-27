import { Controller, Get, UseGuards, Query, Patch, Param, Body } from "@nestjs/common";
import { AdminDashboardService } from "./admin-dashboard.service";
import { JwtAuthGuard } from "../auth/guard/jwt-auth.guard";
import { RolesGuard } from "../auth/guard/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/dto/user-response.dto";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get("revenue/summary")
  async getRevenueSummary() {
    return this.dashboardService.getRevenueSummary();
  }

  @Get("dashboard/analytics")
  async getAnalytics() {
    return this.dashboardService.getAnalytics();
  }

  @Get("users")
  async getUsers(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
  ) {
    return this.dashboardService.getUsers(page, limit, search);
  }

  @Patch("users/:id/status")
  async updateUserStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.dashboardService.updateUserStatus(id, status, currentUser.id);
  }

  @Patch("users/:id/role")
  async updateUserRole(
    @Param("id") id: string,
    @Body("role") role: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.dashboardService.updateUserRole(id, role, currentUser.id);
  }
}
