"use client";

import React, { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Custom hook to detect clicks outside
function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial dates or default to today
  const parseDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const startVal = parseDate(value.startDate);
  const endVal = parseDate(value.endDate);

  // States for calendar navigation
  const [currentMonth, setCurrentMonth] = useState(endVal.getMonth());
  const [currentYear, setCurrentYear] = useState(endVal.getFullYear());

  // Temp selection states while picking range
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  useClickOutside(containerRef, () => setIsOpen(false));

  const monthsVietnamese = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // Helper format YYYY-MM-DD
  const formatYYYYMMDD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Preset options
  const presets = [
    {
      label: "7 ngày qua",
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 6);
        return { startDate: formatYYYYMMDD(start), endDate: formatYYYYMMDD(end) };
      }
    },
    {
      label: "30 ngày qua",
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 29);
        return { startDate: formatYYYYMMDD(start), endDate: formatYYYYMMDD(end) };
      }
    },
    {
      label: "Tháng này",
      getValue: () => {
        const start = new Date();
        start.setDate(1);
        const end = new Date();
        return { startDate: formatYYYYMMDD(start), endDate: formatYYYYMMDD(end) };
      }
    },
    {
      label: "Tháng trước",
      getValue: () => {
        const start = new Date();
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        const end = new Date();
        end.setDate(0); // ngày cuối cùng tháng trước
        return { startDate: formatYYYYMMDD(start), endDate: formatYYYYMMDD(end) };
      }
    }
  ];

  const handlePresetSelect = (presetValue: DateRange) => {
    onChange(presetValue);
    setIsOpen(false);
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentYear, currentMonth, day);
    clickedDate.setHours(0, 0, 0, 0);

    const start = new Date(value.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(value.endDate);
    end.setHours(0, 0, 0, 0);

    // Flow chọn dải ngày:
    // 1. Nếu chưa có start hoặc cả start & end đều có rồi -> đặt ngày click làm start, reset end
    // 2. Nếu đã có start nhưng chưa có end (hoặc start bằng end):
    //    a. Nếu click trước start -> đặt click làm start
    //    b. Nếu click sau start -> đặt click làm end
    const hasBoth = value.startDate && value.endDate && value.startDate !== value.endDate;

    if (!value.startDate || hasBoth) {
      onChange({ startDate: formatYYYYMMDD(clickedDate), endDate: formatYYYYMMDD(clickedDate) });
    } else {
      if (clickedDate < start) {
        onChange({ startDate: formatYYYYMMDD(clickedDate), endDate: formatYYYYMMDD(clickedDate) });
      } else {
        onChange({ startDate: value.startDate, endDate: formatYYYYMMDD(clickedDate) });
        setIsOpen(false); // Đóng panel sau khi chọn xong dải ngày
      }
    }
  };

  // Calendar generation helpers
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // Sunday = 0
  const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Mon = 0, Sun = 6

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDaysBefore = Array.from({ length: adjustedFirstDayIndex });

  const isSelected = (day: number) => {
    const d = new Date(currentYear, currentMonth, day);
    d.setHours(0, 0, 0, 0);

    const start = new Date(value.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(value.endDate);
    end.setHours(0, 0, 0, 0);

    return d.getTime() === start.getTime() || d.getTime() === end.getTime();
  };

  const isInRange = (day: number) => {
    const d = new Date(currentYear, currentMonth, day);
    d.setHours(0, 0, 0, 0);

    const start = new Date(value.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(value.endDate);
    end.setHours(0, 0, 0, 0);

    // Trình tự chọn tạm thời
    if (value.startDate === value.endDate && hoveredDate) {
      const hoverEnd = new Date(hoveredDate);
      hoverEnd.setHours(0, 0, 0, 0);
      if (hoverEnd > start) {
        return d > start && d <= hoverEnd;
      }
    }

    return d > start && d < end;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
  };

  // Formatting date string to show on the input field
  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const selectedPreset = presets.find(
    (p) => p.getValue().startDate === value.startDate && p.getValue().endDate === value.endDate
  );

  return (
    <div ref={containerRef} className={cn("relative inline-block w-full sm:w-[325px]", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-11 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 text-sm text-foreground shadow-sm transition hover:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/15 cursor-pointer"
      >
        <span className="flex items-center gap-2 truncate pr-1">
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          {value.startDate && value.endDate ? (
            value.startDate === value.endDate ? (
              formatDateLabel(value.startDate)
            ) : (
              `${formatDateLabel(value.startDate)} - ${formatDateLabel(value.endDate)}`
            )
          ) : (
            <span className="text-muted-foreground">Chọn khoảng ngày</span>
          )}
        </span>
        {selectedPreset && (
          <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary uppercase shrink-0">
            {selectedPreset.label}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 flex flex-col md:flex-row gap-4 rounded-3xl border border-border bg-slate-950/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Preset Buttons Sidebar */}
          <div className="flex flex-row md:flex-col gap-2 border-b md:border-b-0 md:border-r border-border pb-3.5 md:pb-0 md:pr-4 mb-2 md:mb-0 overflow-x-auto shrink-0 scrollbar-none md:w-[130px]">
            {presets.map((preset) => {
              const isActive = value.startDate === preset.getValue().startDate && value.endDate === preset.getValue().endDate;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePresetSelect(preset.getValue())}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold transition whitespace-nowrap cursor-pointer w-full",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  <span>{preset.label}</span>
                  {isActive && <Check className="size-3.5 ml-2 hidden md:block" />}
                </button>
              );
            })}
          </div>

          {/* Calendar Picker Panel */}
          <div className="w-[280px] p-1 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="flex size-7 items-center justify-center rounded-lg border border-white/10 hover:bg-white/5 transition cursor-pointer"
              >
                <ChevronLeft className="size-4 text-muted-foreground" />
              </button>
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                {monthsVietnamese[currentMonth]} / {currentYear}
              </h4>
              <button
                type="button"
                onClick={handleNextMonth}
                className="flex size-7 items-center justify-center rounded-lg border border-white/10 hover:bg-white/5 transition cursor-pointer"
              >
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            </div>

            {/* Week Headers */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">
              <div>T2</div>
              <div>T3</div>
              <div>T4</div>
              <div>T5</div>
              <div>T6</div>
              <div>T7</div>
              <div className="text-rose-500/80">CN</div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {emptyDaysBefore.map((_, idx) => (
                <div key={`empty-${idx}`} className="size-9" />
              ))}

              {daysArray.map((day) => {
                const isDaySelected = isSelected(day);
                const isDayInRange = isInRange(day);
                const isDayToday = isToday(day);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDateClick(day)}
                    onMouseEnter={() => {
                      if (value.startDate && value.startDate === value.endDate) {
                        setHoveredDate(new Date(currentYear, currentMonth, day));
                      }
                    }}
                    onMouseLeave={() => setHoveredDate(null)}
                    className={cn(
                      "size-9 rounded-lg text-xs font-bold transition flex items-center justify-center relative cursor-pointer",
                      isDaySelected && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md z-10",
                      isDayInRange && "bg-primary/20 text-primary rounded-none hover:bg-primary/35",
                      !isDaySelected && !isDayInRange && (isDayToday ? "border border-primary text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground")
                    )}
                  >
                    <span>{day}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
