import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prismaService: PrismaService) {}

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

    const ticketDistribution = ticketsByTier.map((t, idx) => {
      const typeInfo = ticketTypes.find(tt => tt.id === t.ticketTypeId);
      return {
        label: typeInfo ? typeInfo.name : "Khác",
        value: Math.round((t._count.id / totalSold) * 100),
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
        seatZones: {
          include: {
            ticketTypes: true,
          },
        },
      },
    });

    // 2. Fetch ticket sales info for each concert
    const eventAnalytics = [];
    
    // Get last 14 days dates in YYYY-MM-DD format
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().split("T")[0];
    });

    for (const concert of concerts) {
      // Calculate total capacity
      let capacity = 0;
      const ticketTypesMap = new Map<string, any>();
      
      concert.seatZones.forEach(zone => {
        zone.ticketTypes.forEach(tt => {
          capacity += tt.totalQuantity;
          ticketTypesMap.set(tt.id, tt);
        });
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

      // Group tickets by ticketTypeId and day for the last 14 days
      const tierVelocity = [];

      for (const [ttId, tt] of ticketTypesMap.entries()) {
        const dailySales = last14Days.map(dateStr => {
          // Count tickets created on this date
          const count = soldTickets.filter(ticket => {
            if (ticket.ticketTypeId !== ttId) return false;
            const tDate = new Date(ticket.createdAt).toISOString().split("T")[0];
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
}
