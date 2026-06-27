"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { ConcertTable } from "@/components/concert-table";
import {
  getRevenueSummary,
  getConcerts,
  getDashboardAnalytics,
} from "@/lib/api";
import {
  BarChart3,
  Users,
  Calendar,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Percent,
  Activity,
} from "lucide-react";

function DailySalesChart({ data }: { data: any[] }) {
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
  const right = 45;
  const bottom = 30;
  const left = 55;
  const graphWidth = width - left - right;
  const graphHeight = height - top - bottom;

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1000000);
  const maxTickets = Math.max(...data.map((d) => d.ticketsSold), 10);

  // Build line path for revenue
  let linePath = "";
  let areaPath = "";

  data.forEach((d, i) => {
    const x = left + (i / (data.length - 1)) * graphWidth;
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
    <div className="relative w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
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
              />
              <text
                x={left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
              >
                {revVal >= 1000000
                  ? `${(revVal / 1000000).toFixed(0)}Mđ`
                  : `${revVal.toLocaleString()}đ`}
              </text>
            </g>
          );
        })}

        {/* X Axis label for days */}
        {data
          .filter((_, idx) => idx % 5 === 0 || idx === data.length - 1)
          .map((d, idx) => {
            const originalIdx = data.indexOf(d);
            const x = left + (originalIdx / (data.length - 1)) * graphWidth;
            return (
              <text
                key={idx}
                x={x}
                y={top + graphHeight + 18}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {d.day}
              </text>
            );
          })}

        {/* Bar chart for tickets sold */}
        {data.map((d, i) => {
          const x = left + (i / (data.length - 1)) * graphWidth;
          const barHeight = (d.ticketsSold / maxTickets) * graphHeight;
          const y = top + graphHeight - barHeight;
          return (
            <g key={i}>
              <rect
                x={x - 4}
                y={y}
                width={8}
                height={barHeight}
                className="fill-cyan-500/30 hover:fill-cyan-500/50 transition-all cursor-pointer"
                rx={1}
              >
                <title>{`Ngày ${d.day}: Bán ${d.ticketsSold} vé`}</title>
              </rect>
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
        {data
          .filter((d) => d.revenue > 0)
          .map((d, i) => {
            const idx = data.indexOf(d);
            const x = left + (idx / (data.length - 1)) * graphWidth;
            const y =
              top + graphHeight - (d.revenue / maxRevenue) * graphHeight;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={3.5}
                className="fill-card stroke-[#e5484d] stroke-2 hover:r-5 cursor-pointer transition-all"
              >
                <title>{`Ngày ${d.day}: Doanh thu ${d.revenue.toLocaleString("vi-VN")}đ`}</title>
              </circle>
            );
          })}
      </svg>
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="mb-2 text-4xl font-black tracking-tight text-foreground">
              Báo cáo & Phân tích
            </h1>
            <p className="text-muted-foreground">
              Tổng quan bán vé, doanh thu và thống kê từ dữ liệu thời gian thực.
            </p>
          </div>
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
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
                  <BarChart3 className="size-10 text-emerald-500/25" />
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
                  <TrendingUp className="size-10 text-accent/25" />
                </div>
              </div>
            </div>

            {/* Combined Chart & Distribution */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-[2rem] border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
                <div className="mb-4">
                  <h3 className="text-lg font-black text-foreground">
                    Doanh thu & Số lượng vé bán ra tháng trước
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Cột xanh: Số vé bán ra (đơn vị: vé) · Đường đỏ: Doanh thu
                    (đơn vị: đ)
                  </p>
                </div>
                <div className="mt-4">
                  <DailySalesChart data={stats.dailyRevenueLastMonth || []} />
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
                          className={`h-full ${item.color || "bg-primary"}`}
                          style={{ width: `${item.value}%` }}
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

            {/* Monthly Sales (Historic) */}
            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-black text-foreground">
                Tăng trưởng doanh thu 8 tháng qua
              </h3>
              <div className="h-44 flex items-end gap-3 px-4 pt-6">
                {stats.monthlySales?.map((value: number, idx: number) => (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-2 group"
                  >
                    <div
                      className="w-full rounded-t-xl bg-primary/25 group-hover:bg-primary/50 transition-all duration-300"
                      style={{ height: `${value || 4}%` }}
                      title={`Doanh thu tương đối: ${value}%`}
                    />
                    <span className="text-[10px] text-muted-foreground font-bold">
                      Tháng {idx + 1}
                    </span>
                  </div>
                )) || (
                  <div className="text-muted-foreground w-full text-center py-12">
                    Không có dữ liệu biểu đồ
                  </div>
                )}
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
