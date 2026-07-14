"use client";

import { useEffect, useState, useRef } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { ConcertTable } from "@/components/concert-table";
import {
  getRevenueSummary,
  getConcerts,
  getDashboardAnalytics,
  getDashboardRevenueAnalyticsAdmin,
} from "@/lib/api";
import { DateRangePicker, DateRange } from "@/components/date-range-picker";
import {
  BarChart3,
  Users,
  Calendar,
  TrendingUp,
  RefreshCw,
  Activity,
  LayoutDashboard,
  LayoutGrid,
  Table2,
  FolderKanban,
} from "lucide-react";

const getTicketColor = (label: string) => {
  const normalized = label.toLowerCase();
  if (normalized.includes("svip")) return "#e5484d";
  if (normalized.includes("vip")) return "#e0a82e";
  if (normalized.includes("cat1") || normalized.includes("cat 1")) return "#3d6f8f";
  if (normalized.includes("cat2") || normalized.includes("cat 2")) return "#123c3a";
  if (normalized.includes("ga")) return "#64748b";
  return "#8b5e83"; // default
};

interface DailySalesChartProps {
  data: Array<{
    date: string;
    ticketsSold: number;
    revenue: number;
  }>;
}

function DailySalesChart({ data }: DailySalesChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-muted-foreground text-sm font-semibold py-20">
        Không có dữ liệu bán hàng trong khoảng thời gian này.
      </div>
    );
  }

  // Find max values for normalization
  const maxTickets = Math.max(...data.map((d) => d.ticketsSold), 1);
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  // Group columns if too many data points (e.g. over 30 days) to keep charts readable
  return (
    <div className="flex h-56 w-full items-end gap-1 md:gap-2.5 pt-6 pb-2 px-1">
      {data.map((day, idx) => {
        const ticketHeightPercent = (day.ticketsSold / maxTickets) * 100;
        const revenueHeightPercent = (day.revenue / maxRevenue) * 100;
        const formattedDate = new Date(day.date).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
        });

        return (
          <div
            key={day.date}
            className="group relative flex flex-1 h-full flex-col justify-end items-center"
          >
            {/* Tooltip on hover */}
            <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-foreground text-background text-[10px] p-2.5 rounded-xl shadow-xl z-20 pointer-events-none min-w-[120px] border border-border/25">
              <p className="font-bold border-b border-background/20 pb-1 mb-1 w-full text-center">
                {formattedDate}
              </p>
              <p className="flex justify-between w-full gap-2">
                <span>Vé bán:</span>
                <strong className="text-primary">{day.ticketsSold}</strong>
              </p>
              <p className="flex justify-between w-full gap-2 mt-0.5">
                <span>Doanh thu:</span>
                <strong className="text-emerald-500">
                  {day.revenue >= 1000000
                    ? `${(day.revenue / 1000000).toFixed(1)}Mđ`
                    : `${day.revenue.toLocaleString("vi-VN")}đ`}
                </strong>
              </p>
            </div>

            {/* Side-by-side / overlay charts: Column for tickets sold, line dot for revenue */}
            <div className="w-full flex items-end justify-center gap-0.5 h-full relative">
              {/* Tickets Column */}
              <div
                className="w-1/2 rounded-t-md bg-primary/20 group-hover:bg-primary/35 transition-all duration-300 relative"
                style={{ height: `${Math.max(ticketHeightPercent, 4)}%` }}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 bg-primary/30 rounded-t-md"
                  style={{ height: "15%" }}
                />
              </div>

              {/* Revenue Overlay Dot/Line connector wrapper */}
              <div
                className="absolute w-2.5 h-2.5 rounded-full bg-emerald-500 border border-card shadow-md transition-all group-hover:scale-125 z-10"
                style={{
                  bottom: `calc(${revenueHeightPercent}% - 5px)`,
                }}
              />
            </div>

            {/* Simple date label */}
            <span className="text-[9px] font-mono font-bold text-muted-foreground/60 mt-2 block tracking-tighter truncate max-w-full">
              {formattedDate}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [concertsList, setConcertsList] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dashboardLayout, setDashboardLayout] = useState<'grid' | 'tabs' | 'table'>('grid');
  const [activeReportTab, setActiveReportTab] = useState<'chart' | 'distribution' | 'events'>('chart');

  // Khởi tạo khoảng ngày mặc định: 30 ngày qua cho dashboard
  const getInitialDateRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 29);

    const format = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    return { startDate: format(start), endDate: format(end) };
  };

  const [dateRange, setDateRange] = useState<DateRange>(getInitialDateRange());
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(false);

  async function loadDashboardData() {
    setLoading(true);
    setError(null);
    try {
      const concertsData = await getConcerts();
      setConcertsList(concertsData.items || []);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "Không thể tải dữ liệu dashboard. Vui lòng kiểm tra lại kết nối.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadDashboardSummary(start: string, end: string) {
    try {
      const summaryData = await getRevenueSummary(start, end);
      setStats(summaryData);
    } catch (err) {
      console.error("Failed to load dashboard summary:", err);
    }
  }

  async function loadRevenueAnalytics() {
    setRevenueLoading(true);
    try {
      const data = await getDashboardRevenueAnalyticsAdmin(
        dateRange.startDate,
        dateRange.endDate,
      );
      setRevenueData(data || []);
    } catch (err) {
      console.error("Failed to load dashboard revenue analytics:", err);
    } finally {
      setRevenueLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    loadRevenueAnalytics();
    loadDashboardSummary(dateRange.startDate, dateRange.endDate);
  }, [dateRange.startDate, dateRange.endDate]);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <h1 className="mb-2 text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
              <LayoutDashboard className="size-9 text-primary" />
              Tổng quan
            </h1>
            <p className="text-muted-foreground">
              Tổng quan bán vé, doanh thu và thống kê từ dữ liệu thời gian thực.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Bố cục Toggle */}
            <div className="inline-flex rounded-full bg-muted p-1 border border-border">
              <button
                type="button"
                onClick={() => setDashboardLayout('grid')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  dashboardLayout === 'grid' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="size-3.5" />
                Grid
              </button>
              <button
                type="button"
                onClick={() => setDashboardLayout('tabs')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  dashboardLayout === 'tabs' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FolderKanban className="size-3.5" />
                Tab Phân Khu
              </button>
              <button
                type="button"
                onClick={() => setDashboardLayout('table')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  dashboardLayout === 'table' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Table2 className="size-3.5" />
                Bảng biểu
              </button>
            </div>

            <button
              onClick={() => {
                loadDashboardData();
                loadRevenueAnalytics();
                loadDashboardSummary(dateRange.startDate, dateRange.endDate);
              }}
              disabled={loading || revenueLoading}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary active:scale-95 disabled:opacity-50 cursor-pointer animate-fade-in"
            >
              <RefreshCw
                className={`size-4 ${loading || revenueLoading ? "animate-spin" : ""}`}
              />
              Làm mới
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-center">
            <p className="text-destructive font-semibold mb-4">{error}</p>
            <button
              onClick={loadDashboardData}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && !stats && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-32 rounded-3xl border border-border bg-card p-6 animate-pulse"
                />
              ))}
            </div>
            <div className="h-64 rounded-3xl border border-border bg-card p-6 animate-pulse" />
          </div>
        )}

        {/* OVERVIEW CONTENT */}
        {stats && (
          <>
            {/* Top Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Tổng doanh thu
                    </p>
                    <p className="text-3xl font-black text-foreground">
                      {stats.totalRevenue >= 1000000000
                        ? `${(stats.totalRevenue / 1000000000).toFixed(2)}Bđ`
                        : `${(stats.totalRevenue || 0).toLocaleString("vi-VN")}đ`}
                    </p>
                  </div>
                  <Activity className="size-10 text-primary/25" />
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Tổng người dùng
                    </p>
                    <p className="text-3xl font-black text-foreground">
                      {(stats.users || 0).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <Users className="size-10 text-primary/25" />
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Doanh thu tháng trước
                    </p>
                    <p className="text-3xl font-black text-foreground">
                      {stats.lastMonthRevenue >= 1000000000
                        ? `${(stats.lastMonthRevenue / 1000000000).toFixed(2)}Bđ`
                        : `${(stats.lastMonthRevenue || 0).toLocaleString("vi-VN")}đ`}
                    </p>
                  </div>
                  <BarChart3 className="size-10 text-primary/25" />
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Vé đã bán (Tổng)
                    </p>
                    <p className="text-3xl font-black text-foreground">
                      {(stats.ticketsSold || 0).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <TrendingUp className="size-10 text-primary/25" />
                </div>
              </div>
            </div>

            {dashboardLayout === 'grid' && (
              <>
                {/* Combined Chart & Distribution */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 animate-fade-in">
                  <div className="lg:col-span-2 rounded-[2rem] border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-lg font-black text-foreground">
                          Doanh thu & Số vé bán hàng ngày
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Cột xanh: Số vé bán ra (đơn vị: vé) · Đường đỏ: Doanh thu
                          (đơn vị: đ)
                        </p>
                      </div>
                      <DateRangePicker value={dateRange} onChange={setDateRange} />
                    </div>
                    <div className="mt-4 relative min-h-[260px] flex items-center justify-center">
                      {revenueLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground animate-pulse font-bold text-sm">
                          <RefreshCw className="size-4 animate-spin" />
                          Đang tải dữ liệu...
                        </div>
                      ) : (
                        <DailySalesChart data={revenueData} />
                      )}
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
                    <h3 className="mb-4 text-lg font-black text-foreground">
                      Phân bổ doanh số loại vé
                    </h3>
                    <div className="space-y-4 flex-1 flex flex-col justify-center">
                      {stats.ticketDistribution && stats.ticketDistribution.length > 0 ? (
                        stats.ticketDistribution.map((item: any) => (
                          <div key={item.label}>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-semibold text-muted-foreground">
                                {item.label}
                              </span>
                              <span className="text-sm font-black text-foreground">
                                {item.value}%
                              </span>
                            </div>
                            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full"
                                style={{ width: `${item.value}%`, backgroundColor: getTicketColor(item.label) }}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground text-center py-16">
                          Không có dữ liệu để thống kê
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent Events */}
                <div className="space-y-4 animate-fade-in">
                  <h2 className="text-2xl font-black text-foreground">
                    Sự kiện gần đây
                  </h2>
                  {concertsList.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                      Chưa có sự kiện nào được ghi nhận.
                    </div>
                  ) : (
                    <ConcertTable concerts={concertsList.slice(0, 5)} />
                  )}
                </div>
              </>
            )}

            {dashboardLayout === 'tabs' && (
              <div className="space-y-6 animate-fade-in">
                {/* Tab selector bar */}
                <div className="flex gap-2 border-b border-border/40 pb-3">
                  <button
                    onClick={() => setActiveReportTab('chart')}
                    className={`px-4 py-2 text-sm font-bold border-b-2 transition cursor-pointer ${
                      activeReportTab === 'chart' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Biểu đồ Doanh thu & Vé
                  </button>
                  <button
                    onClick={() => setActiveReportTab('distribution')}
                    className={`px-4 py-2 text-sm font-bold border-b-2 transition cursor-pointer ${
                      activeReportTab === 'distribution' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Phân bổ Loại vé
                  </button>
                  <button
                    onClick={() => setActiveReportTab('events')}
                    className={`px-4 py-2 text-sm font-bold border-b-2 transition cursor-pointer ${
                      activeReportTab === 'events' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Sự kiện quản lý
                  </button>
                </div>

                {/* Tab contents */}
                <div className="mt-4">
                  {activeReportTab === 'chart' && (
                    <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm flex flex-col justify-between animate-fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-lg font-black text-foreground">
                            Doanh thu & Số vé bán hàng ngày
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Cột xanh: Số vé bán ra (đơn vị: vé) · Đường đỏ: Doanh thu (đơn vị: đ)
                          </p>
                        </div>
                        <DateRangePicker value={dateRange} onChange={setDateRange} />
                      </div>
                      <div className="mt-4 relative min-h-[260px] flex items-center justify-center">
                        {revenueLoading ? (
                          <div className="flex items-center gap-2 text-muted-foreground animate-pulse font-bold text-sm">
                            <RefreshCw className="size-4 animate-spin" />
                            Đang tải dữ liệu...
                          </div>
                        ) : (
                          <DailySalesChart data={revenueData} />
                        )}
                      </div>
                    </div>
                  )}

                  {activeReportTab === 'distribution' && (
                    <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm max-w-xl mx-auto flex flex-col justify-between animate-fade-in">
                      <h3 className="mb-6 text-lg font-black text-foreground">
                        Phân bổ doanh số loại vé
                      </h3>
                      <div className="space-y-6 flex-1 flex flex-col justify-center">
                        {stats.ticketDistribution && stats.ticketDistribution.length > 0 ? (
                          stats.ticketDistribution.map((item: any) => (
                            <div key={item.label}>
                              <div className="flex justify-between mb-2">
                                <span className="text-sm font-bold text-muted-foreground">
                                  {item.label}
                                </span>
                                <span className="text-sm font-black text-foreground">
                                  {item.value}%
                                </span>
                              </div>
                              <div className="h-3 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full"
                                  style={{ width: `${item.value}%`, backgroundColor: getTicketColor(item.label) }}
                                />
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-muted-foreground text-center py-16">
                            Không có dữ liệu để thống kê
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeReportTab === 'events' && (
                    <div className="space-y-4 animate-fade-in">
                      <h2 className="text-xl font-black text-foreground">
                        Sự kiện quản lý gần đây
                      </h2>
                      {concertsList.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                          Chưa có sự kiện nào được ghi nhận.
                        </div>
                      ) : (
                        <ConcertTable concerts={concertsList.slice(0, 8)} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {dashboardLayout === 'table' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-foreground animate-fade-in">
                    Tất cả sự kiện quản lý ({concertsList.length})
                  </h2>
                </div>
                {concertsList.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                    Chưa có sự kiện nào.
                  </div>
                ) : (
                  <ConcertTable concerts={concertsList} />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
