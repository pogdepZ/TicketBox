import { Controller, Get, UseGuards } from "@nestjs/common";
import { AdminDashboardService } from "./admin-dashboard.service";
import { JwtAuthGuard } from "../auth/guard/jwt-auth.guard";
import { RolesGuard } from "../auth/guard/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

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
}
