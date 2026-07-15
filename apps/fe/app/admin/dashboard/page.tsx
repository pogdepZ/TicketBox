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

function DailySalesChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-muted-foreground text-center py-16">
        Không có dữ liệu biểu đồ
      </div>
    );
  }

  const numDays = data.length;
  const left = 60;
  const right = 20;
  const top = 30;
  const bottom = 40;
  const minGraphWidth = 700;

  // Thuật toán Spacing động: chia đều cột nếu số ngày <= 12, nếu nhiều hơn thì cho cuộn ngang
  const dayWidth = numDays <= 12 ? minGraphWidth / numDays : 45;
  const graphWidth = numDays <= 12 ? minGraphWidth : numDays * dayWidth;

  const barWidth =
    numDays <= 12 ? Math.max(12, Math.min(24, dayWidth * 0.3)) : 14;

  const width = graphWidth + left + right;
  const height = 260;
  const graphHeight = height - top - bottom;

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1000000);
  const maxTickets = Math.max(...data.map((d) => d.ticketsSold), 10);

  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, showLeft: false });
  const containerRef = useRef<HTMLDivElement>(null);

  const getX = (i: number) => left + i * dayWidth + dayWidth / 2;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgEl = e.currentTarget;
    const rect = svgEl.getBoundingClientRect();
    const clientX = e.clientX - rect.left;

    const scaleX = width / rect.width;
    const svgX = clientX * scaleX;

    const xInGraph = svgX - left;
    const dayIdx = Math.round((xInGraph - dayWidth / 2) / dayWidth);

    if (dayIdx >= 0 && dayIdx < numDays) {
      setHoveredDayIdx(dayIdx);

      if (containerRef.current) {
        const cRect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - cRect.left;
        const y = e.clientY - cRect.top;
        const showLeft = x > cRect.width - 190;

        setTooltipPos({
          x,
          y: y - 12,
          showLeft,
        });
      }
    } else {
      setHoveredDayIdx(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredDayIdx(null);
  };

  const formatDateLabel = (item: any) => {
    if (item.date) {
      const parts = item.date.split("-");
      if (parts.length >= 3) return `${parts[2]}/${parts[1]}`;
      return item.date;
    }
    return item.day;
  };

  const formatDateTooltip = (item: any) => {
    if (item.date) {
      const parts = item.date.split("-");
      if (parts.length >= 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return item.date;
    }
    return `Ngày ${item.day}`;
  };

  // Build line path for revenue
  let linePath = "";
  let areaPath = "";

  data.forEach((d, i) => {
    const x = getX(i);
    const y = top + graphHeight - (d.revenue / maxRevenue) * graphHeight;
    if (i === 0) {
      linePath = `M ${x} ${y}`;
      areaPath = `M ${x} ${top + graphHeight} L ${x} ${y}`;
    } else {
      linePath += ` L ${x} ${y}`;
      areaPath += ` L ${x} ${y}`;
    }
    if (i === data.length - 1) {
      areaPath += ` L ${x} ${top + graphHeight} Z`;
    }
  });

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <div
          style={{
            height: "260px",
            width: numDays <= 12 ? "100%" : `${width}px`,
            minWidth: "100%",
          }}
        >
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id="chartRevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e5484d" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#e5484d" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Y Axis Grid lines */}
            {Array.from({ length: 5 }).map((_, idx) => {
              const y = top + (idx / 4) * graphHeight;
              const revVal = maxRevenue - (idx / 4) * maxRevenue;
              return (
                <g key={idx}>
                  <line
                    x1={left}
                    y1={y}
                    x2={left + graphWidth}
                    y2={y}
                    stroke="var(--color-border)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    opacity={0.5}
                  />
                  <text
                    x={left - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-muted-foreground text-[10px] font-medium"
                  >
                    {revVal >= 1000000
                      ? `${(revVal / 1000000).toFixed(0)}Mđ`
                      : `${revVal.toLocaleString()}đ`}
                  </text>
                </g>
              );
            })}

            {/* X Axis Date Labels */}
            {data.map((d, idx) => {
              const step = Math.max(Math.ceil(numDays / 12), 1);
              const isLast = idx === numDays - 1;
              if (idx % step !== 0 && !isLast) return null;
              if (isLast && idx % step > 0 && idx % step < step * 0.4)
                return null;

              const x = getX(idx);
              return (
                <g key={idx}>
                  <line
                    x1={x}
                    y1={top + graphHeight}
                    x2={x}
                    y2={top + graphHeight + 4}
                    stroke="var(--color-border)"
                    strokeWidth={1}
                  />
                  <text
                    x={x}
                    y={top + graphHeight + 18}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[9px] font-bold"
                  >
                    {formatDateLabel(d)}
                  </text>
                </g>
              );
            })}

            {/* Vertical Guide Line on hover */}
            {hoveredDayIdx !== null && (
              <line
                x1={getX(hoveredDayIdx)}
                y1={top}
                x2={getX(hoveredDayIdx)}
                y2={top + graphHeight}
                stroke="#3b82f6"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                className="transition-all duration-75"
              />
            )}

            {/* Bar chart for tickets sold */}
            {data.map((d, i) => {
              const x = getX(i) - barWidth / 2;
              const barHeight = (d.ticketsSold / maxTickets) * graphHeight;
              const y = top + graphHeight - barHeight;
              return (
                <g key={i}>
                  {d.ticketsSold > 0 ? (
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barHeight, 2)}
                      fill="rgb(6, 182, 212)" // cyan-500
                      opacity={0.35}
                      rx={1.5}
                    />
                  ) : (
                    <rect
                      x={x}
                      y={top + graphHeight - 1}
                      width={barWidth}
                      height={1}
                      fill="var(--color-border)"
                      opacity={0.2}
                    />
                  )}
                </g>
              );
            })}

            {/* Area fill under Line chart */}
            {areaPath && <path d={areaPath} fill="url(#chartRevGrad)" />}

            {/* Line path for revenue */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#e5484d"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Points on Line chart */}
            {data.map((d, i) => {
              const x = getX(i);
              const y =
                top + graphHeight - (d.revenue / maxRevenue) * graphHeight;
              const isHoveredPoint = hoveredDayIdx === i;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={isHoveredPoint ? 5.5 : 3.5}
                  className="fill-card stroke-[#e5484d] stroke-2 transition-all duration-100"
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredDayIdx !== null && (
        <div
          style={{
            left: tooltipPos.showLeft ? "auto" : `${tooltipPos.x + 15}px`,
            right: tooltipPos.showLeft
              ? `${containerRef.current ? containerRef.current.clientWidth - tooltipPos.x + 15 : 0}px`
              : "auto",
            top: `${tooltipPos.y}px`,
            transform: "translateY(-100%)",
          }}
          className="pointer-events-none absolute z-30 flex flex-col gap-1.5 rounded-xl border border-white/10 bg-slate-950/95 p-3 text-xs shadow-2xl backdrop-blur-md transition-all duration-75"
        >
          <p className="font-bold text-white mb-0.5">
            {formatDateTooltip(data[hoveredDayIdx])}
          </p>
          <div className="flex flex-col gap-1 text-[11px]">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="size-2 rounded-full bg-[#e5484d] shrink-0" />
              <span className="font-medium">Doanh thu:</span>
              <strong className="text-white ml-auto">
                {data[hoveredDayIdx].revenue.toLocaleString("vi-VN")} đ
              </strong>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="size-2 rounded-full bg-cyan-500 shrink-0" />
              <span className="font-medium">Vé bán ra:</span>
              <strong className="text-white ml-auto">
                {data[hoveredDayIdx].ticketsSold} vé
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VelocityChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-muted-foreground text-center py-16">
        Không có dữ liệu biểu đồ
      </div>
    );
  }

  const width = 600;
  const height = 260;
  const top = 20;
  const right = 110;
  const bottom = 30;
  const left = 40;
  const graphWidth = width - left - right;
  const graphHeight = height - top - bottom;

  // Find max count across all data to scale Y
  let maxCount = 10;
  data.forEach((tier) => {
    tier.dailySales.forEach((s: any) => {
      if (s.count > maxCount) maxCount = s.count;
    });
  });

  const colors = [
    "#e5484d",
    "#e0a82e",
    "#3d6f8f",
    "#123c3a",
    "#64748b",
    "#af52de",
  ];

  const formatDate = (str: string) => {
    const parts = str.split("-");
    if (parts.length >= 3) return `${parts[2]}/${parts[1]}`;
    return str;
  };

  return (
    <div className="relative w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Y Axis Grid lines */}
        {Array.from({ length: 5 }).map((_, idx) => {
          const y = top + (idx / 4) * graphHeight;
          const val = Math.round(maxCount - (idx / 4) * maxCount);
          return (
            <g key={idx}>
              <line
                x1={left}
                y1={y}
                x2={left + graphWidth}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <text
                x={left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
              >
                {val} vé
              </text>
            </g>
          );
        })}

        {/* X Axis label for dates */}
        {data[0]?.dailySales
          .filter((_: any, idx: number) => idx % 3 === 0 || idx === 13)
          .map((s: any, idx: number) => {
            const originalIdx = data[0].dailySales.indexOf(s);
            const x = left + (originalIdx / 13) * graphWidth;
            return (
              <text
                key={idx}
                x={x}
                y={top + graphHeight + 18}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {formatDate(s.date)}
              </text>
            );
          })}

        {/* Draw lines for each tier */}
        {data.map((tier, idx) => {
          let linePath = "";
          const color = colors[idx % colors.length];

          tier.dailySales.forEach((s: any, i: number) => {
            const x = left + (i / 13) * graphWidth;
            const y = top + graphHeight - (s.count / maxCount) * graphHeight;
            if (i === 0) {
              linePath = `M ${x} ${y}`;
            } else {
              linePath += ` L ${x} ${y}`;
            }
          });

          return (
            <g key={idx}>
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {/* Draw points */}
              {tier.dailySales.map((s: any, i: number) => {
                const x = left + (i / 13) * graphWidth;
                const y =
                  top + graphHeight - (s.count / maxCount) * graphHeight;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={3}
                    fill={color}
                    className="hover:r-4.5 cursor-pointer transition-all"
                  >
                    <title>{`${tier.tierName} - Ngày ${formatDate(s.date)}: Bán ${s.count} vé`}</title>
                  </circle>
                );
              })}
            </g>
          );
        })}

        {/* Legend on the right side */}
        {data.map((tier, idx) => {
          const color = colors[idx % colors.length];
          const y = top + idx * 20;
          return (
            <g
              key={idx}
              transform={`translate(${left + graphWidth + 15}, ${y})`}
            >
              <rect width={12} height={12} rx={3} fill={color} />
              <text
                x={18}
                y={10}
                className="fill-foreground text-[10px] font-bold"
              >
                {tier.tierName}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [concertsList, setConcertsList] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const [summaryData, concertsData] = await Promise.all([
        getRevenueSummary(),
        getConcerts(),
      ]);

      setStats(summaryData);
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
  }, [dateRange.startDate, dateRange.endDate]);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="mb-2 text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
              <LayoutDashboard className="size-9 text-primary" />
              Tổng quan
            </h1>
            <p className="text-muted-foreground">
              Tổng quan bán vé, doanh thu và thống kê từ dữ liệu thời gian thực.
            </p>
          </div>
          <button
            onClick={() => {
              loadDashboardData();
              loadRevenueAnalytics();
            }}
            disabled={loading || revenueLoading}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`size-4 ${loading || revenueLoading ? "animate-spin" : ""}`}
            />
            Làm mới
          </button>
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Tổng sự kiện
                    </p>
                    <p className="text-3xl font-black text-foreground">
                      {stats.totalEvents ?? concertsList.length}
                    </p>
                  </div>
                  <Calendar className="size-10 text-primary/25" />
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

            {/* Combined Chart & Distribution */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                  {stats.ticketDistribution?.map((item: any) => (
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
                  )) || (
                    <div className="text-muted-foreground text-center py-16">
                      Không có dữ liệu phân bổ
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Events */}
            <div className="space-y-4">
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
      </div>
    </AdminLayout>
  );
}
