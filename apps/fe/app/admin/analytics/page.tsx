"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { getDashboardAnalytics, getUserAnalyticsAdmin, getGenreRevenueAnalytics } from "@/lib/api";
import { DateRangePicker, DateRange } from "@/components/date-range-picker";
import { Users, Percent, Activity, RefreshCw, BarChart3, Search, X } from "lucide-react";

function VelocityChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-muted-foreground text-center py-16">
        Không có dữ liệu biểu đồ
      </div>
    );
  }

  const numDays = data[0]?.dailySales.length || 0;
  const left = 45;
  const right = 20;
  const top = 30;
  const bottom = 40;
  const dayWidth = 45;

  // Tính mốc Y tối đa dựa trên lượng vé bán lớn nhất của một hạng vé đơn lẻ
  let maxCount = 10;
  data.forEach((tier) => {
    tier.dailySales.forEach((s: any) => {
      if (s.count > maxCount) maxCount = s.count;
    });
  });

  const minGraphWidth = 500;
  const graphWidth = Math.max(minGraphWidth, numDays * dayWidth);
  const width = graphWidth + left + right;
  const height = 280;
  const graphHeight = height - top - bottom;

  const colors = [
    "#e5484d", // Đỏ
    "#e0a82e", // Vàng
    "#3d6f8f", // Xanh dương
    "#123c3a", // Xanh lá
    "#64748b", // Xám
    "#af52de", // Tím
  ];

  // State quản lý việc highlight khi hover Legend
  const [activeTierIdx, setActiveTierIdx] = useState<number | null>(null);

  // State quản lý hover dọc theo ngày để hiển thị multi-tooltip
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, showLeft: false });
  const widgetRef = useRef<HTMLDivElement>(null);

  const formatDate = (str: string) => {
    const parts = str.split("-");
    if (parts.length >= 3) return `${parts[2]}/${parts[1]}`;
    return str;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgEl = e.currentTarget;
    const rect = svgEl.getBoundingClientRect();
    const clientX = e.clientX - rect.left;

    // Chuyển đổi sang hệ tọa độ logic viewBox của SVG
    const scaleX = width / rect.width;
    const svgX = clientX * scaleX;

    // Tính toán xem con trỏ đang ở ngày thứ mấy
    const xInGraph = svgX - left;
    const dayIdx = Math.round(xInGraph / dayWidth);

    if (dayIdx >= 0 && dayIdx < numDays) {
      setHoveredDayIdx(dayIdx);

      // Tính toán tọa độ tương đối với widgetRef (container ngoài cùng) để tooltip ko làm phình scroll
      if (widgetRef.current) {
        const widgetRect = widgetRef.current.getBoundingClientRect();
        const x = e.clientX - widgetRect.left;
        const y = e.clientY - widgetRect.top;
        const showLeft = x > widgetRect.width - 170; // Hiển thị bên trái nếu quá sát lề phải

        setTooltipPos({
          x,
          y: y - 12, // Dịch lên trên con trỏ chuột
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

  return (
    <div ref={widgetRef} className="flex flex-col gap-5 w-full relative">
      {/* Legend bên ngoài SVG (HTML) - Đã sửa lỗi Layout Shift khi hover */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-xs font-bold text-foreground">
        {data.map((tier, idx) => {
          const color = colors[idx % colors.length];
          const isMuted = activeTierIdx !== null && activeTierIdx !== idx;
          return (
            <div
              key={idx}
              onMouseEnter={() => setActiveTierIdx(idx)}
              onMouseLeave={() => setActiveTierIdx(null)}
              className={`flex items-center gap-1.5 bg-slate-900/40 border border-white/10 rounded-full px-3 py-1 cursor-pointer transition-opacity duration-200 ${
                isMuted ? "opacity-30" : "opacity-100"
              }`}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span>{tier.tierName}</span>
            </div>
          );
        })}
      </div>

      {/* SVG Container cuộn ngang */}
      <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <div
          style={{ width: `${width}px`, minWidth: "100%" }}
          className="relative"
        >
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
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
                    opacity={0.5}
                  />
                  <text
                    x={left - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-muted-foreground text-[10px] font-medium"
                  >
                    {val} vé
                  </text>
                </g>
              );
            })}

            {/* X Axis line */}
            <line
              x1={left}
              y1={top + graphHeight}
              x2={left + graphWidth}
              y2={top + graphHeight}
              stroke="var(--color-border)"
              strokeWidth={1.5}
            />

            {/* X Axis Date Labels */}
            {data[0]?.dailySales.map((s: any, idx: number) => {
              const step = Math.max(Math.ceil(numDays / 12), 1);
              const isLast = idx === numDays - 1;
              if (idx % step !== 0 && !isLast) return null;
              // Chặn đè nhãn cuối nếu nhãn trước quá gần (khoảng cách < 40% step)
              if (isLast && idx % step > 0 && idx % step < step * 0.4)
                return null;

              const x = left + idx * dayWidth;
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
                    {formatDate(s.date)}
                  </text>
                </g>
              );
            })}

            {/* Vertical Guide Line when hovering a day */}
            {hoveredDayIdx !== null && (
              <line
                x1={left + hoveredDayIdx * dayWidth}
                y1={top}
                x2={left + hoveredDayIdx * dayWidth}
                y2={top + graphHeight}
                stroke="#3b82f6"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                className="transition-all duration-75"
              />
            )}

            {/* Draw lines for each tier */}
            {data.map((tier, idx) => {
              let linePath = "";
              const color = colors[idx % colors.length];
              const isHighlight =
                activeTierIdx === null || activeTierIdx === idx;

              tier.dailySales.forEach((s: any, i: number) => {
                const x = left + i * dayWidth;
                const y =
                  top + graphHeight - (s.count / maxCount) * graphHeight;
                if (i === 0) {
                  linePath = `M ${x} ${y}`;
                } else {
                  linePath += ` L ${x} ${y}`;
                }
              });

              return (
                <g
                  key={idx}
                  opacity={isHighlight ? 1 : 0.15}
                  className="transition-opacity duration-300"
                >
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke={color}
                      strokeWidth={isHighlight ? 2.5 : 1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {/* Draw points */}
                  {tier.dailySales.map((s: any, i: number) => {
                    const x = left + i * dayWidth;
                    const y =
                      top + graphHeight - (s.count / maxCount) * graphHeight;
                    const isHoveredPoint = hoveredDayIdx === i;

                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r={isHoveredPoint && isHighlight ? 5.5 : 3.5}
                        fill={color}
                        stroke="#0f172a"
                        strokeWidth={isHoveredPoint && isHighlight ? 2 : 1}
                        className="transition-all duration-100"
                      />
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Multi-Tooltip ngoài rìa scroll-box (nằm dưới relative parent ngoài cùng) */}
      {hoveredDayIdx !== null && (
        <div
          style={{
            left: tooltipPos.showLeft ? "auto" : `${tooltipPos.x + 15}px`,
            right: tooltipPos.showLeft
              ? `${widgetRef.current ? widgetRef.current.clientWidth - tooltipPos.x + 15 : 0}px`
              : "auto",
            top: `${tooltipPos.y}px`,
            transform: "translateY(-100%)", // Đẩy tooltip bay lên phía trên con trỏ chuột
          }}
          className="pointer-events-none absolute z-30 flex flex-col gap-1.5 rounded-xl border border-white/10 bg-slate-950/95 p-3 text-xs shadow-2xl backdrop-blur-md transition-all duration-75"
        >
          <p className="font-bold text-white mb-1">
            Ngày {formatDate(data[0].dailySales[hoveredDayIdx].date)}
          </p>
          <div className="flex flex-col gap-1 text-[11px]">
            {data.map((tier, idx) => {
              const count = tier.dailySales[hoveredDayIdx].count;
              const color = colors[idx % colors.length];
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-slate-300"
                >
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-medium">{tier.tierName}:</span>
                  <strong className="text-white ml-auto">{count} vé</strong>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function UserAnalyticsChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-muted-foreground text-center py-16">
        Không có dữ liệu người dùng mới trong khoảng thời gian này
      </div>
    );
  }

  const numDays = data.length;
  const left = 45;
  const right = 20;
  const top = 25;
  const bottom = 40;
  const minGraphWidth = 1000;

  // Thuật toán Spacing động: chia đều cột nếu số ngày <= 12
  const dayWidth = numDays <= 12 ? minGraphWidth / numDays : 45;
  const graphWidth = numDays <= 12 ? minGraphWidth : numDays * dayWidth;

  const barWidth =
    numDays <= 12 ? Math.max(16, Math.min(32, dayWidth * 0.4)) : 20;

  const maxCount = Math.max(...data.map((d) => d.count), 5); // Tối thiểu mốc là 5 để làm thước đo đẹp

  const width = graphWidth + left + right;
  const height = 240;
  const graphHeight = height - top - bottom;

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
    const dayIdx = Math.floor(xInGraph / dayWidth);

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

  const formatDate = (str: string) => {
    const parts = str.split("-");
    if (parts.length >= 3) return `${parts[2]}/${parts[1]}`;
    return str;
  };

  const formatDateTooltip = (str: string) => {
    const parts = str.split("-");
    if (parts.length >= 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return str;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <div
          style={{
            height: "240px",
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
                    opacity={0.5}
                  />
                  <text
                    x={left - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-muted-foreground text-[10px] font-medium"
                  >
                    {val} user
                  </text>
                </g>
              );
            })}

            {/* X Axis line */}
            <line
              x1={left}
              y1={top + graphHeight}
              x2={left + graphWidth}
              y2={top + graphHeight}
              stroke="var(--color-border)"
              strokeWidth={1.5}
            />

            {/* X Axis Date Labels */}
            {data.map((s: any, idx: number) => {
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
                    {formatDate(s.date)}
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
                stroke="#e5484d"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                className="transition-all duration-75"
                opacity={0.4}
              />
            )}

            {/* Bars */}
            {data.map((item: any, idx: number) => {
              const x = left + idx * dayWidth + (dayWidth - barWidth) / 2;
              const barHeight = (item.count / maxCount) * graphHeight;
              const y = top + graphHeight - barHeight;

              const isHovered = hoveredDayIdx === idx;

              return (
                <g
                  key={idx}
                  className="group transition-all duration-150"
                >
                  {/* Invisible wide bar for easier hover */}
                  <rect
                    x={x - 4}
                    y={top}
                    width={barWidth + 8}
                    height={graphHeight}
                    fill="transparent"
                    className="cursor-pointer"
                  />
                  {item.count > 0 && (
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barHeight, 2)}
                      fill={isHovered ? "#ff6b6f" : "#e5484d"} // Hover highlight
                      rx={2}
                      className="transition-all duration-150"
                    />
                  )}
                  {item.count === 0 && (
                    <rect
                      x={x}
                      y={top + graphHeight - 1}
                      width={barWidth}
                      height={1}
                      fill="var(--color-border)"
                      opacity={0.3}
                      rx={0.5}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
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
            Ngày {formatDateTooltip(data[hoveredDayIdx].date)}
          </p>
          <div className="flex flex-col gap-1 text-[11px]">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="size-2 rounded-full bg-[#e5484d] shrink-0" />
              <span className="font-medium">Người dùng mới:</span>
              <strong className="text-white ml-auto">
                {data[hoveredDayIdx].count.toLocaleString("vi-VN")} thành viên
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GenreRevenuePieChart({ data }: { data: any[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="text-muted-foreground text-center py-16">
        Không có dữ liệu doanh thu thể loại trong khoảng thời gian này
      </div>
    );
  }

  const colors = [
    "#e5484d", // Đỏ
    "#e0a82e", // Vàng
    "#3d6f8f", // Xanh dương
    "#2a9d8f", // Teal
    "#af52de", // Tím
    "#64748b", // Xám
  ];

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const activeGenresCount = data.filter(item => item.revenue > 0).length;
  const topGenre = data[0];

  // Doughnut math
  const radius = 70;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;
  const center = 100;
  const gapAngle = data.length > 1 ? 0.02 : 0; // small gap between segments

  // Pre-compute arc segments to avoid mutable let in JSX
  const segments = useMemo(() => {
    let accumulated = 0;
    return data.map((item, idx) => {
      const ratio = totalRevenue > 0 ? item.revenue / totalRevenue : 0;
      const segmentLength = Math.max((ratio - gapAngle) * circumference, 0);
      const offset = -accumulated * circumference; // negative = clockwise advance
      accumulated += ratio;
      return {
        segmentLength,
        offset,
        color: colors[idx % colors.length],
        ratio,
      };
    });
  }, [data, totalRevenue]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 bg-card border border-border/40 rounded-[2rem] shadow-sm">
      {/* Cột 1: Doughnut Chart SVG */}
      <div className="lg:col-span-4 flex flex-col items-center justify-center">
        <div className="relative size-[200px] shrink-0">
          <svg viewBox="0 0 200 200" className="size-full" style={{ transform: 'rotate(-90deg)' }}>
            {/* Base background circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="var(--color-border)"
              strokeOpacity={0.1}
              strokeWidth={strokeWidth}
            />
            {segments.map((seg, idx) => {
              const isHovered = hoveredIdx === idx;
              const isAnyHovered = hoveredIdx !== null;
              const opacity = isAnyHovered ? (isHovered ? 1.0 : 0.3) : 1.0;
              const currentStrokeWidth = isHovered ? strokeWidth + 5 : strokeWidth;

              return (
                <circle
                  key={idx}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={currentStrokeWidth}
                  strokeDasharray={`${seg.segmentLength} ${circumference - seg.segmentLength}`}
                  strokeDashoffset={seg.offset}
                  strokeLinecap="butt"
                  className="transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer"
                  style={{ opacity }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </svg>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
            {hoveredIdx !== null ? (
              <>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  {data[hoveredIdx].genre}
                </span>
                <span className="text-base font-black text-foreground mt-0.5">
                  {data[hoveredIdx].percentage}%
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  Tổng doanh thu
                </span>
                <span className="text-sm font-black text-foreground mt-0.5">
                  {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(totalRevenue)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cột 2: Chi tiết theo thể loại (Legend list) */}
      <div className="lg:col-span-4 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-border/30 pt-6 lg:pt-0 lg:pl-6">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Chi tiết theo thể loại</h4>
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {data.map((item, idx) => {
              const color = colors[idx % colors.length];
              const isHovered = hoveredIdx === idx;
              const isAnyHovered = hoveredIdx !== null;
              const opacity = isAnyHovered ? (isHovered ? 1.0 : 0.4) : 1.0;

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-background/30 transition-all duration-300 cursor-pointer"
                  style={{ opacity, transform: isHovered ? "translateX(4px)" : "none" }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs font-bold text-foreground truncate">{item.genre}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-foreground">
                      {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(item.revenue)}
                    </span>
                    <span className="block text-[9px] font-bold text-muted-foreground">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cột 3: Key Financial Metrics & Strategic Insights (Cột ngoài cùng) */}
      <div className="lg:col-span-4 flex flex-col justify-between space-y-6 border-t lg:border-t-0 lg:border-l border-border/30 pt-6 lg:pt-0 lg:pl-6">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Chỉ số tài chính</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-muted/20 p-3 rounded-2xl border border-border/40">
              <span className="text-xs text-muted-foreground font-medium">Tổng doanh số</span>
              <span className="text-sm font-black text-primary">
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(totalRevenue)}
              </span>
            </div>
            
            <div className="flex justify-between items-center bg-muted/20 p-3 rounded-2xl border border-border/40">
              <span className="text-xs text-muted-foreground font-medium">Thể loại dẫn đầu</span>
              <div className="text-right">
                <span className="text-xs font-black text-foreground block">
                  {topGenre ? topGenre.genre : "N/A"}
                </span>
                <span className="text-[10px] text-muted-foreground font-bold">
                  {topGenre ? `${topGenre.percentage}% doanh thu` : "0%"}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center bg-muted/20 p-3 rounded-2xl border border-border/40">
              <span className="text-xs text-muted-foreground font-medium">Số nhóm tạo doanh thu</span>
              <span className="text-xs font-black text-foreground">
                {activeGenresCount} / {data.length} nhóm
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedConcertId, setSelectedConcertId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventPage, setEventPage] = useState(1);
  const eventLimit = 3;

  // Khởi tạo khoảng ngày mặc định: 30 ngày qua
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
  const [userAnalyticsData, setUserAnalyticsData] = useState<any[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  // Genre Revenue Analytics States
  const [genreDateRange, setGenreDateRange] = useState<DateRange>(getInitialDateRange());
  const [genreData, setGenreData] = useState<any[]>([]);
  const [genreLoading, setGenreLoading] = useState(false);
  const [genreError, setGenreError] = useState<string | null>(null);

  async function loadGenreRevenue() {
    setGenreLoading(true);
    setGenreError(null);
    try {
      const data = await getGenreRevenueAnalytics(
        genreDateRange.startDate,
        genreDateRange.endDate,
      );
      setGenreData(data || []);
    } catch (err: any) {
      console.error(err);
      setGenreError("Không thể tải dữ liệu doanh thu theo thể loại.");
    } finally {
      setGenreLoading(false);
    }
  }

  async function loadAnalyticsData() {
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardAnalytics();
      setAnalytics(data);
      setEventPage(1);
      if (data?.eventAnalytics?.length > 0) {
        setSelectedConcertId(data.eventAnalytics[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "Không thể tải dữ liệu phân tích. Vui lòng kiểm tra lại kết nối.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadUserAnalytics() {
    setUserLoading(true);
    setUserError(null);
    try {
      const data = await getUserAnalyticsAdmin(
        dateRange.startDate,
        dateRange.endDate,
      );
      setUserAnalyticsData(data || []);
    } catch (err: any) {
      console.error(err);
      setUserError("Không thể tải dữ liệu phân tích người dùng mới.");
    } finally {
      setUserLoading(false);
    }
  }

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  useEffect(() => {
    loadUserAnalytics();
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    loadGenreRevenue();
  }, [genreDateRange.startDate, genreDateRange.endDate]);

  const [searchQuery, setSearchQuery] = useState("");

  const filteredEvents = useMemo(() => {
    if (!analytics?.eventAnalytics) return [];
    if (!searchQuery.trim()) return analytics.eventAnalytics;
    const query = searchQuery.toLowerCase().trim();
    return analytics.eventAnalytics.filter((event: any) =>
      event.title?.toLowerCase().includes(query) ||
      event.artist?.toLowerCase().includes(query)
    );
  }, [analytics?.eventAnalytics, searchQuery]);

  useEffect(() => {
    setEventPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (filteredEvents.length > 0) {
      const exists = filteredEvents.some((e: any) => e.id === selectedConcertId);
      if (!exists) {
        setSelectedConcertId(filteredEvents[0].id);
      }
    } else {
      setSelectedConcertId(null);
    }
  }, [filteredEvents]);

  const selectedConcertAnalytic = analytics?.eventAnalytics?.find(
    (e: any) => e.id === selectedConcertId,
  );

  const totalEventPages = Math.ceil(
    (filteredEvents.length || 0) / eventLimit,
  );
  const paginatedEvents = useMemo(() => {
    return filteredEvents.slice(
      (eventPage - 1) * eventLimit,
      eventPage * eventLimit,
    );
  }, [filteredEvents, eventPage, eventLimit]);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="mb-2 text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
              <BarChart3 className="size-9 text-primary" />
              Phân tích chi tiết
            </h1>
            <p className="text-muted-foreground">
              Theo dõi hành vi người dùng, tỷ lệ lấp đầy sự kiện và tốc độ bán
              vé theo thời gian thực.
            </p>
          </div>
          <button
            onClick={() => {
              loadAnalyticsData();
              loadUserAnalytics();
              loadGenreRevenue();
            }}
            disabled={loading || userLoading || genreLoading}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`size-4 ${loading || userLoading || genreLoading ? "animate-spin" : ""}`}
            />
            Làm mới
          </button>
        </div>

        {error && (
          <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-center">
            <p className="text-destructive font-semibold mb-4">{error}</p>
            <button
              onClick={loadAnalyticsData}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        )}

        {loading && !analytics && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="h-32 rounded-3xl border border-border bg-card p-6 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="h-96 rounded-[2.5rem] border border-border bg-card p-6 animate-pulse" />
              <div className="lg:col-span-2 h-96 rounded-[2.5rem] border border-border bg-card p-6 animate-pulse" />
            </div>
          </div>
        )}

        {analytics && (
          <>
            {/* Thống kê người dùng đăng ký mới (Bar Chart) */}
            <div className="rounded-[2.5rem] border border-border bg-card p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-foreground mb-1 flex items-center gap-2">
                    <Users className="size-5 text-primary" />
                    Thống kê người dùng đăng ký mới
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Theo dõi số lượng tài khoản đăng ký mới theo khoảng thời
                    gian tùy chỉnh.
                  </p>
                </div>
                <DateRangePicker value={dateRange} onChange={setDateRange} />
              </div>

              {userError && (
                <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive font-semibold">
                  {userError}
                </div>
              )}

              <div className="flex items-center justify-center min-h-[240px]">
                {userLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground animate-pulse font-bold text-sm">
                    <RefreshCw className="size-4 animate-spin" />
                    Đang tải dữ liệu...
                  </div>
                ) : (
                  <UserAnalyticsChart data={userAnalyticsData} />
                )}
              </div>
            </div>

            {/* Doanh thu theo thể loại sự kiện (Doughnut Chart) */}
            <div className="rounded-[2.5rem] border border-border bg-card p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-foreground mb-1 flex items-center gap-2">
                    <Percent className="size-5 text-primary" />
                    Doanh thu theo thể loại sự kiện
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Tỷ lệ phần trăm đóng góp doanh thu của từng thể loại đêm nhạc trong khoảng thời gian tùy chọn.
                  </p>
                </div>
                <DateRangePicker value={genreDateRange} onChange={setGenreDateRange} />
              </div>

              {genreError && (
                <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive font-semibold">
                  {genreError}
                </div>
              )}

              <div className="min-h-[260px] flex items-center justify-center">
                {genreLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground animate-pulse font-bold text-sm">
                    <RefreshCw className="size-4 animate-spin" />
                    Đang tải dữ liệu...
                  </div>
                ) : (
                  <div className="w-full">
                    <GenreRevenuePieChart data={genreData} />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Sell-through rates list */}
              <div className="lg:col-span-1 rounded-[2.5rem] border border-border bg-card p-6 shadow-sm h-fit">
                <h3 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
                  <Percent className="size-5 text-primary" />
                  Tỷ lệ bán vé theo sự kiện
                </h3>
                
                {/* Search Bar */}
                <div className="relative mb-5">
                  <input
                    type="text"
                    placeholder="Tìm sự kiện, nghệ sĩ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-background/50 px-4 py-2 pl-9 text-xs font-medium text-foreground placeholder-muted-foreground outline-none transition focus:border-primary/50 focus:bg-background"
                  />
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                <div className="min-h-[380px] flex flex-col justify-between">
                  <div className="space-y-4 flex-grow">
                    {paginatedEvents.map((event: any) => (
                      <div
                        key={event.id}
                        onClick={() => setSelectedConcertId(event.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          selectedConcertId === event.id
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/40 bg-card"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-foreground text-sm line-clamp-1 mb-1.5">
                              {event.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="truncate">{event.artist}</span>
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${
                                  event.status === "PUBLISHED"
                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                    : event.status === "COMPLETED"
                                      ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                      : event.status === "CANCELLED"
                                        ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                        : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                                }`}
                              >
                                {event.status === "PUBLISHED"
                                  ? "Mở bán"
                                  : event.status === "COMPLETED"
                                    ? "Đã kết thúc"
                                    : event.status === "CANCELLED"
                                      ? "Đã hủy"
                                      : "Nháp"}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                              event.sellThroughRate >= 80
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : event.sellThroughRate >= 30
                                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                  : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            }`}
                          >
                            {event.sellThroughRate}%
                          </span>
                        </div>

                        <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                          <span>
                            {event.ticketsSold.toLocaleString()} /{" "}
                            {event.capacity.toLocaleString()} vé
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              event.sellThroughRate >= 80
                                ? "bg-emerald-500"
                                : event.sellThroughRate >= 30
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                            }`}
                            style={{ width: `${event.sellThroughRate}%` }}
                          />
                        </div>
                      </div>
                    ))}

                    {paginatedEvents.length === 0 && (
                      <div className="flex flex-col items-center justify-center text-center py-16 h-full">
                        <Search className="size-10 text-muted-foreground/30 mb-3 animate-pulse" />
                        <span className="font-bold text-sm text-foreground block">Không có kết quả</span>
                        <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
                          Không tìm thấy sự kiện hoặc nghệ sĩ nào khớp với từ khoá "{searchQuery}".
                        </p>
                      </div>
                    )}
                  </div>

                  {totalEventPages > 1 && (
                    <div className="flex items-center justify-between border-t border-border/60 pt-4 mt-4">
                      <span className="text-xs text-muted-foreground">
                        Trang{" "}
                        <strong className="text-foreground">{eventPage}</strong>{" "}
                        / {totalEventPages}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          disabled={eventPage <= 1}
                          onClick={() => {
                            const newPage = eventPage - 1;
                            setEventPage(newPage);
                            const newPageEvents =
                              filteredEvents.slice(
                                (newPage - 1) * eventLimit,
                                newPage * eventLimit,
                              );
                            if (newPageEvents.length > 0) {
                              setSelectedConcertId(newPageEvents[0].id);
                            }
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-border bg-card hover:text-primary transition disabled:opacity-40 cursor-pointer"
                        >
                          Trước
                        </button>
                        <button
                          disabled={eventPage >= totalEventPages}
                          onClick={() => {
                            const newPage = eventPage + 1;
                            setEventPage(newPage);
                            const newPageEvents =
                              filteredEvents.slice(
                                (newPage - 1) * eventLimit,
                                newPage * eventLimit,
                              );
                            if (newPageEvents.length > 0) {
                              setSelectedConcertId(newPageEvents[0].id);
                            }
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-border bg-card hover:text-primary transition disabled:opacity-40 cursor-pointer"
                        >
                          Sau
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Velocity Bar Chart */}
              <div className="lg:col-span-2 rounded-[2.5rem] border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black text-foreground mb-1 flex items-center gap-2">
                    <Activity className="size-5 text-primary" />
                    Biểu đồ tốc độ bán vé kể từ ngày mở bán
                  </h3>
                  {selectedConcertAnalytic ? (
                    selectedConcertAnalytic.status === "DRAFT" ? (
                      <p className="text-xs text-muted-foreground">
                        Sự kiện{" "}
                        <strong className="text-foreground">
                          {selectedConcertAnalytic.title}
                        </strong>{" "}
                        hiện đang ở trạng thái bản nháp.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Doanh số bán vé hàng ngày kể từ khi mở bán tại sự kiện:{" "}
                        <strong className="text-foreground">
                          {selectedConcertAnalytic.title}
                        </strong>
                      </p>
                    )
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Vui lòng chọn sự kiện bên danh sách để xem biểu đồ tốc độ
                      bán vé.
                    </p>
                  )}
                </div>

                <div className="mt-6 flex-1 flex items-center justify-center">
                  {selectedConcertAnalytic ? (
                    selectedConcertAnalytic.status === "DRAFT" ? (
                      <div className="text-muted-foreground text-center py-16 flex flex-col items-center gap-3">
                        <BarChart3 className="size-12 text-muted-foreground/30 animate-pulse" />
                        <span className="font-bold text-sm text-foreground">
                          Sự kiện vẫn chưa được xuất bản
                        </span>
                        <p className="text-xs text-muted-foreground max-w-xs">
                          Biểu đồ phân tích doanh số và tốc độ bán vé chỉ hiển
                          thị sau khi sự kiện được công bố chính thức.
                        </p>
                      </div>
                    ) : selectedConcertAnalytic.tierVelocity?.length > 0 ? (
                      <VelocityChart
                        data={selectedConcertAnalytic.tierVelocity}
                      />
                    ) : (
                      <div className="text-muted-foreground py-16">
                        Không có dữ liệu tốc độ bán vé cho sự kiện này.
                      </div>
                    )
                  ) : (
                    <div className="text-muted-foreground py-16">
                      Vui lòng chọn sự kiện để xem biểu đồ.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
