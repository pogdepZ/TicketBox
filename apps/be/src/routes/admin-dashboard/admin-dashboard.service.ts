import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuthCacheService } from "../auth/auth-cache.service";

function getLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly authCacheService: AuthCacheService,
  ) {}

  async getRevenueSummary() {
    const now = new Date();
    
    // 1. Total Concerts
    const totalEvents = await this.prismaService.concert.count();

    // 2. Total Users
    const users = await this.prismaService.user.count();

    // 3. Tickets Sold
    const ticketsSold = await this.prismaService.ticket.count({
      where: {
        status: {
          in: ["ACTIVE", "USED"],
        },
      },
    });

    // 4. Total Revenue from PAID orders
    const paidOrders = await this.prismaService.order.findMany({
      where: {
        status: "PAID",
      },
      select: {
        totalAmount: true,
        paidAt: true,
      },
    });
    
    const revenue = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    // 5. Last Month Start & End (UTC time)
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed (e.g. 5 is June)
    // May would be month-1
    const startOfLastMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfLastMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const lastMonthOrders = await this.prismaService.order.findMany({
      where: {
        status: "PAID",
        paidAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
      select: {
        totalAmount: true,
      },
    });
    
    const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const newUsersLastMonth = await this.prismaService.user.count({
      where: {
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    });

    // 6. Daily revenue & tickets in the last month
    const daysInLastMonth = endOfLastMonth.getDate();
    const dailyRevenueLastMonth = Array.from({ length: daysInLastMonth }, (_, i) => {
      const dayStr = String(i + 1).padStart(2, "0");
      return {
        day: dayStr,
        revenue: 0,
        ticketsSold: 0,
      };
    });

    // Populate daily revenue from orders paid in last month
    const lastMonthPaidOrdersWithDate = await this.prismaService.order.findMany({
      where: {
        status: "PAID",
        paidAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
      select: {
        totalAmount: true,
        paidAt: true,
      },
    });

    for (const order of lastMonthPaidOrdersWithDate) {
      if (!order.paidAt) continue;
      const dateObj = new Date(order.paidAt);
      const dayIndex = dateObj.getDate() - 1;
      if (dayIndex >= 0 && dayIndex < dailyRevenueLastMonth.length) {
        dailyRevenueLastMonth[dayIndex].revenue += Number(order.totalAmount);
      }
    }

    // Populate daily tickets sold from tickets paid in last month
    const lastMonthTicketsWithDate = await this.prismaService.ticket.findMany({
      where: {
        status: { in: ["ACTIVE", "USED"] },
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
      select: {
        createdAt: true,
      },
    });

    for (const ticket of lastMonthTicketsWithDate) {
      const dateObj = new Date(ticket.createdAt);
      const dayIndex = dateObj.getDate() - 1;
      if (dayIndex >= 0 && dayIndex < dailyRevenueLastMonth.length) {
        dailyRevenueLastMonth[dayIndex].ticketsSold += 1;
      }
    }

    // 7. Monthly Sales (for last 8 months, scaled to 100 max)
    const monthlySalesRaw = [];
    for (let i = 7; i >= 0; i--) {
      const targetMonthStart = new Date(year, month - i, 1, 0, 0, 0, 0);
      const targetMonthEnd = new Date(year, month - i + 1, 0, 23, 59, 59, 999);
      
      const mOrders = await this.prismaService.order.findMany({
        where: {
          status: "PAID",
          paidAt: {
            gte: targetMonthStart,
            lte: targetMonthEnd,
          },
        },
        select: {
          totalAmount: true,
        },
      });
      const mRev = mOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
      monthlySalesRaw.push(mRev);
    }
    
    const maxVal = Math.max(...monthlySalesRaw, 1);
    const monthlySales = monthlySalesRaw.map(v => Math.round((v / maxVal) * 100));

    // 8. Ticket distribution by TicketType name
    const ticketsByTier = await this.prismaService.ticket.groupBy({
      by: ["ticketTypeId"],
      where: {
        status: { in: ["ACTIVE", "USED"] },
      },
      _count: {
        id: true,
      },
    });

    const ticketTypes = await this.prismaService.ticketType.findMany();
    const colors = ["bg-primary", "bg-[#e0a82e]", "bg-[#3d6f8f]", "bg-accent", "bg-slate-500", "bg-indigo-500"];
    const totalSold = ticketsSold || 1;

    // Gom nhóm số lượng vé theo tên hạng vé
    const distributionMap = new Map<string, number>();
    ticketsByTier.forEach((t) => {
      const typeInfo = ticketTypes.find((tt) => tt.id === t.ticketTypeId);
      const label = typeInfo ? typeInfo.name : "Khác";
      const count = t._count.id;
      distributionMap.set(label, (distributionMap.get(label) || 0) + count);
    });

    const ticketDistribution = Array.from(distributionMap.entries()).map(([label, count], idx) => {
      return {
        label,
        value: Math.round((count / totalSold) * 100),
        color: colors[idx % colors.length],
      };
    });

    return {
      totalEvents,
      ticketsSold,
      revenue,
      users,
      lastMonthRevenue,
      newUsersLastMonth,
      monthlySales,
      ticketDistribution,
      dailyRevenueLastMonth,
    };
  }

  async getAnalytics() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startOfLastMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfLastMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const newUsersLastMonth = await this.prismaService.user.count({
      where: {
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    });

    // 1. Fetch all concerts
    const concerts = await this.prismaService.concert.findMany({
      include: {
        ticketTypes: true,
        seatZones: true,
      },
    });

    // 2. Fetch ticket sales info for each concert
    const eventAnalytics = [];

    for (const concert of concerts) {
      // Calculate total capacity
      let capacity = 0;
      const ticketTypesMap = new Map<string, any>();
      
      concert.ticketTypes.forEach(tt => {
        capacity += tt.totalQuantity;
        ticketTypesMap.set(tt.id, tt);
      });

      // Count actual sold tickets
      const soldTickets = await this.prismaService.ticket.findMany({
        where: {
          concertId: concert.id,
          status: { in: ["ACTIVE", "USED"] },
        },
        select: {
          id: true,
          ticketTypeId: true,
          createdAt: true,
        },
      });

      const ticketsSold = soldTickets.length;
      const sellThroughRate = capacity > 0 ? Math.round((ticketsSold / capacity) * 100) : 0;

      // Generate dates from concert creation (sales open) to 1 day before event
      const endDate = new Date(new Date(concert.eventDate).getTime() - 24 * 60 * 60 * 1000);
      const startDate = new Date(concert.createdAt);

      if (startDate >= endDate) {
        startDate.setTime(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // Tính số ngày chênh lệch thực tế để đảm bảo có tối thiểu 7 ngày hiển thị
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 7) {
        startDate.setTime(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const dateList: string[] = [];
      const tempDate = new Date(startDate);
      const endDateStr = getLocalDateString(endDate);

      while (true) {
        const currentDateStr = getLocalDateString(tempDate);
        dateList.push(currentDateStr);
        if (currentDateStr === endDateStr) {
          break;
        }
        tempDate.setDate(tempDate.getDate() + 1);
      }

      // Group tickets by ticketTypeId and day for the dateList
      const tierVelocity = [];

      for (const [ttId, tt] of ticketTypesMap.entries()) {
        const dailySales = dateList.map(dateStr => {
          // Count tickets created on this date
          const count = soldTickets.filter(ticket => {
            if (ticket.ticketTypeId !== ttId) return false;
            const tDate = getLocalDateString(new Date(ticket.createdAt));
            return tDate === dateStr;
          }).length;

          return {
            date: dateStr,
            count,
          };
        });

        tierVelocity.push({
          tierName: tt.name,
          dailySales,
        });
      }

      eventAnalytics.push({
        id: concert.id,
        title: concert.name,
        artist: concert.artistName,
        eventDate: concert.eventDate,
        status: concert.status,
        openedAt: concert.createdAt,
        ticketsSold,
        capacity,
        sellThroughRate,
        tierVelocity,
      });
    }

    return {
      newUsersLastMonth,
      eventAnalytics,
    };
  }

  async getUsers(pageStr?: string | number, limitStr?: string | number, search?: string) {
    const page = Math.max(Number(pageStr) || 1, 1);
    const limit = Math.max(Number(limitStr) || 10, 1);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search && search.trim()) {
      const query = search.trim();
      where.OR = [
        { email: { contains: query, mode: "insensitive" } },
        { fullName: { contains: query, mode: "insensitive" } },
      ];
    }

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
          status: true,
          createdAt: true,
          roles: {
            select: {
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      this.prismaService.user.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateUserStatus(id: string, status: string, adminId?: string) {
    if (adminId && id === adminId) {
      throw new BadRequestException("Bạn không thể tự thay đổi trạng thái tài khoản của chính mình.");
    }
    const validStatuses = ["ACTIVE", "BLOCKED", "DELETED"];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException("Trạng thái không hợp lệ");
    }

    const user = await this.prismaService.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException("Không tìm thấy người dùng");
    }

    const updatedUser = await this.prismaService.user.update({
      where: { id },
      data: { status: status as any },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
      },
    });

    await this.authCacheService.invalidateUser(id);

    return updatedUser;
  }

  async updateUserRole(id: string, roleName: string, adminId?: string) {
    if (adminId && id === adminId) {
      throw new BadRequestException("Bạn không thể tự gỡ quyền Quản trị viên của chính mình.");
    }
    if (roleName !== "admin" && roleName !== "user") {
      throw new BadRequestException("Vai trò không hợp lệ");
    }

    const user = await this.prismaService.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException("Không tìm thấy người dùng");
    }

    const role = await this.prismaService.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new NotFoundException(`Không tìm thấy vai trò ${roleName} trong hệ thống`);
    }

    await this.prismaService.$transaction(async (tx) => {
      // Xóa tất cả roles hiện tại
      await tx.userRole.deleteMany({
        where: { userId: id },
      });

      // Tạo link role mới
      await tx.userRole.create({
        data: {
          userId: id,
          roleId: role.id,
        },
      });
    });

    await this.authCacheService.invalidateUser(id);

    return {
      userId: id,
      role: roleName,
    };
  }

  async getUserAnalytics(startDateStr: string, endDateStr: string) {
    if (!startDateStr || !endDateStr) {
      throw new BadRequestException("Vui lòng cung cấp startDate và endDate.");
    }

    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException("Định dạng ngày không hợp lệ.");
    }

    // Lấy toàn bộ users đăng ký trong khoảng thời gian này
    const users = await this.prismaService.user.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Tạo danh sách các ngày chạy từ start đến end
    const dateList: string[] = [];
    const tempDate = new Date(start);
    const endLocalDateStr = getLocalDateString(end);

    while (true) {
      const currentDateStr = getLocalDateString(tempDate);
      dateList.push(currentDateStr);
      if (currentDateStr === endLocalDateStr) {
        break;
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }

    // Đếm số lượng user cho từng ngày
    const data = dateList.map((dateStr) => {
      const count = users.filter((user) => {
        const uDate = getLocalDateString(new Date(user.createdAt));
        return uDate === dateStr;
      }).length;

      return {
        date: dateStr,
        count,
      };
    });

    return data;
  }

  async getRevenueAnalytics(startDateStr: string, endDateStr: string) {
    if (!startDateStr || !endDateStr) {
      throw new BadRequestException("Vui lòng cung cấp startDate và endDate.");
    }

    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException("Định dạng ngày không hợp lệ.");
    }

    // 1. Lọc đơn hàng PAID trong khoảng thời gian
    const paidOrders = await this.prismaService.order.findMany({
      where: {
        status: "PAID",
        paidAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        totalAmount: true,
        paidAt: true,
      },
    });

    // 2. Lọc vé ACTIVE/USED trong khoảng thời gian
    const tickets = await this.prismaService.ticket.findMany({
      where: {
        status: { in: ["ACTIVE", "USED"] },
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // 3. Tạo danh sách các ngày
    const dateList: string[] = [];
    const tempDate = new Date(start);
    const endLocalDateStr = getLocalDateString(end);

    while (true) {
      const currentDateStr = getLocalDateString(tempDate);
      dateList.push(currentDateStr);
      if (currentDateStr === endLocalDateStr) {
        break;
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }

    // 4. Gom nhóm doanh thu và vé bán theo từng ngày
    const data = dateList.map((dateStr) => {
      // Doanh thu từ orders có paidAt trùng ngày
      const dayOrders = paidOrders.filter((o) => {
        if (!o.paidAt) return false;
        return getLocalDateString(new Date(o.paidAt)) === dateStr;
      });
      const revenue = dayOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

      // Vé bán từ tickets có createdAt trùng ngày
      const ticketsSold = tickets.filter((t) => {
        return getLocalDateString(new Date(t.createdAt)) === dateStr;
      }).length;

      return {
        date: dateStr,
        revenue,
        ticketsSold,
      };
    });

    return data;
  }

  async getGenreRevenue(startDateStr: string, endDateStr: string) {
    if (!startDateStr || !endDateStr) {
      throw new BadRequestException("Vui lòng cung cấp startDate và endDate.");
    }

    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException("Định dạng ngày không hợp lệ.");
    }

    // Lọc các orders PAID trong khoảng thời gian kèm type của concert
    const orders = await this.prismaService.order.findMany({
      where: {
        status: "PAID",
        paidAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        totalAmount: true,
        concert: {
          select: {
            type: true,
          },
        },
      },
    });

    const genreMap = new Map<string, number>();
    let totalRevenue = 0;

    for (const order of orders) {
      const genre = order.concert?.type?.trim() || "Khác";
      const amount = Number(order.totalAmount);
      totalRevenue += amount;
      genreMap.set(genre, (genreMap.get(genre) || 0) + amount);
    }

    const entries = Array.from(genreMap.entries())
      .map(([genre, revenue]) => ({ genre, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    // Largest remainder method: percentages always sum to exactly 100
    if (totalRevenue > 0 && entries.length > 0) {
      const rawPercentages = entries.map(e => (e.revenue / totalRevenue) * 100);
      const floored = rawPercentages.map(p => Math.floor(p));
      let remainder = 100 - floored.reduce((sum, v) => sum + v, 0);
      const remainders = rawPercentages.map((p, i) => ({ idx: i, rem: p - floored[i] }));
      remainders.sort((a, b) => b.rem - a.rem);
      for (let i = 0; i < remainder; i++) {
        floored[remainders[i].idx] += 1;
      }
      return entries.map((e, i) => ({
        genre: e.genre,
        revenue: e.revenue,
        percentage: floored[i],
      }));
    }

    return entries.map(e => ({
      genre: e.genre,
      revenue: e.revenue,
      percentage: 0,
    }));
  }
}
