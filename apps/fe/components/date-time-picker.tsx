"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react';

// Custom Hook to detect clicks outside an element
function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

// -------------------------------------------------------------
// 1. DATE PICKER
// -------------------------------------------------------------
interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function DatePicker({ value, onChange, required = false, className = '', placeholder = 'Chọn ngày', disabled = false }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calendar display state (initialized to current selected date or today)
  const initialDate = value ? new Date(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

  useClickOutside(containerRef, () => setIsOpen(false));

  // Sync date view when value changes from outside
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setCurrentMonth(d.getMonth());
        setCurrentYear(d.getFullYear());
      }
    }
  }, [value]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // Sunday = 0, Monday = 1...

  const monthsVietnamese = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const selectedDateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
    onChange(selectedDateStr);
    setIsOpen(false);
  };

  // Render Calendar Cells
  const renderCells = () => {
    const cells = [];
    
    // Add empty spacer cells for the padding before the 1st of the month
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    // Add day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const formattedMonth = String(currentMonth + 1).padStart(2, '0');
      const formattedDay = String(day).padStart(2, '0');
      const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
      const isSelected = value === dateStr;
      
      const today = new Date();
      const isToday = 
        today.getDate() === day && 
        today.getMonth() === currentMonth && 
        today.getFullYear() === currentYear;

      cells.push(
        <button
          key={`day-${day}`}
          type="button"
          onClick={() => handleSelectDay(day)}
          className={`aspect-square flex items-center justify-center rounded-xl text-sm font-semibold transition cursor-pointer select-none active:scale-95 ${
            isSelected 
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary' 
              : isToday
              ? 'border border-primary text-primary hover:bg-primary/10'
              : 'text-foreground hover:bg-muted'
          }`}
        >
          {day}
        </button>
      );
    }
    return cells;
  };

  // Human readable display date
  const getDisplayValue = () => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          readOnly
          required={required}
          disabled={disabled}
          value={getDisplayValue()}
          placeholder={placeholder}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`h-11 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15 cursor-pointer text-left disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed ${className}`}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-72 rounded-[2rem] border border-border bg-card p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 focus:outline-none">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="size-8 flex items-center justify-center rounded-xl border border-border hover:bg-muted text-foreground transition cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-black text-foreground">
              {monthsVietnamese[currentMonth]}, {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="size-8 flex items-center justify-center rounded-xl border border-border hover:bg-muted text-foreground transition cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 text-center text-xs font-bold text-muted-foreground mb-2">
            <div>CN</div>
            <div>T2</div>
            <div>T3</div>
            <div>T4</div>
            <div>T5</div>
            <div>T6</div>
            <div>T7</div>
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {renderCells()}
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 2. TIME PICKER
// -------------------------------------------------------------
interface TimePickerProps {
  value: string; // HH:MM
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function TimePicker({ value, onChange, required = false, className = '', placeholder = 'Chọn giờ', disabled = false }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  const [selectedHour, setSelectedHour] = useState(value ? value.split(':')[0] : '19');
  const [selectedMinute, setSelectedMinute] = useState(value ? value.split(':')[1] : '00');

  useClickOutside(containerRef, () => setIsOpen(false));

  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':');
      setSelectedHour(h);
      setSelectedMinute(m);
    }
  }, [value]);

  // Scroll active elements into view when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const activeHour = hourRef.current?.querySelector('[data-active="true"]');
        const activeMin = minuteRef.current?.querySelector('[data-active="true"]');
        if (activeHour) activeHour.scrollIntoView({ block: 'center' });
        if (activeMin) activeMin.scrollIntoView({ block: 'center' });
      }, 50);
    }
  }, [isOpen]);

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')); // 5 min intervals

  const handleSelectHour = (h: string) => {
    setSelectedHour(h);
    onChange(`${h}:${selectedMinute}`);
  };

  const handleSelectMinute = (m: string) => {
    setSelectedMinute(m);
    onChange(`${selectedHour}:${m}`);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          readOnly
          required={required}
          disabled={disabled}
          value={value || ''}
          placeholder={placeholder}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`h-11 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15 cursor-pointer text-left disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed ${className}`}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-48 rounded-[2rem] border border-border bg-card p-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 flex gap-2">
          {/* Hour column */}
          <div className="flex-1 flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground text-center uppercase tracking-wider mb-2">Giờ</span>
            <div 
              ref={hourRef} 
              className="flex-grow overflow-y-auto max-h-48 scrollbar-none flex flex-col gap-1 pr-1"
            >
              {hours.map(h => {
                const isActive = selectedHour === h;
                return (
                  <button
                    key={`h-${h}`}
                    type="button"
                    data-active={isActive}
                    onClick={() => handleSelectHour(h)}
                    className={`py-1 rounded-xl text-sm font-semibold transition cursor-pointer select-none text-center ${
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25' 
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-border my-2" />

          {/* Minute column */}
          <div className="flex-1 flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground text-center uppercase tracking-wider mb-2">Phút</span>
            <div 
              ref={minuteRef} 
              className="flex-grow overflow-y-auto max-h-48 scrollbar-none flex flex-col gap-1 pl-1"
            >
              {minutes.map(m => {
                const isActive = selectedMinute === m;
                return (
                  <button
                    key={`m-${m}`}
                    type="button"
                    data-active={isActive}
                    onClick={() => handleSelectMinute(m)}
                    className={`py-1 rounded-xl text-sm font-semibold transition cursor-pointer select-none text-center ${
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25' 
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {m}
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

// -------------------------------------------------------------
// 3. DATETIME LOCAL PICKER (DATE + TIME COMBINED)
// -------------------------------------------------------------
interface DateTimePickerProps {
  value: string; // YYYY-MM-DDTHH:MM
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function DateTimePicker({ value, onChange, required = false, className = '', placeholder = 'Chọn ngày & giờ', disabled = false }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Parse state
  const [selectedDate, setSelectedDate] = useState(''); // YYYY-MM-DD
  const [selectedHour, setSelectedHour] = useState('19');
  const [selectedMinute, setSelectedMinute] = useState('00');

  // Calendar UI state
  const initialDate = selectedDate ? new Date(selectedDate) : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setIsOpen(false));

  // Sync state with incoming value changes
  useEffect(() => {
    if (value && value.includes('T')) {
      const [datePart, timePart] = value.split('T');
      setSelectedDate(datePart);
      if (timePart.includes(':')) {
        const [h, m] = timePart.split(':');
        setSelectedHour(h.substring(0, 2));
        setSelectedMinute(m.substring(0, 2));
      }
      
      const d = new Date(datePart);
      if (!isNaN(d.getTime())) {
        setCurrentMonth(d.getMonth());
        setCurrentYear(d.getFullYear());
      }
    } else {
      // Default to today
      const today = new Date();
      const formattedMonth = String(today.getMonth() + 1).padStart(2, '0');
      const formattedDay = String(today.getDate()).padStart(2, '0');
      setSelectedDate(`${today.getFullYear()}-${formattedMonth}-${formattedDay}`);
    }
  }, [value]);

  // Scroll time columns when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const activeHour = hourRef.current?.querySelector('[data-active="true"]');
        const activeMin = minuteRef.current?.querySelector('[data-active="true"]');
        if (activeHour) activeHour.scrollIntoView({ block: 'center' });
        if (activeMin) activeMin.scrollIntoView({ block: 'center' });
      }, 50);
    }
  }, [isOpen]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const monthsVietnamese = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    setSelectedDate(`${currentYear}-${formattedMonth}-${formattedDay}`);
  };

  const handleConfirm = () => {
    if (!selectedDate) return;
    const finalVal = `${selectedDate}T${selectedHour}:${selectedMinute}`;
    onChange(finalVal);
    setIsOpen(false);
  };

  const renderCells = () => {
    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const formattedMonth = String(currentMonth + 1).padStart(2, '0');
      const formattedDay = String(day).padStart(2, '0');
      const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
      const isSelected = selectedDate === dateStr;
      
      const today = new Date();
      const isToday = 
        today.getDate() === day && 
        today.getMonth() === currentMonth && 
        today.getFullYear() === currentYear;

      cells.push(
        <button
          key={`day-${day}`}
          type="button"
          onClick={() => handleSelectDay(day)}
          className={`aspect-square flex items-center justify-center rounded-xl text-sm font-semibold transition cursor-pointer select-none active:scale-95 ${
            isSelected 
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary' 
              : isToday
              ? 'border border-primary text-primary hover:bg-primary/10'
              : 'text-foreground hover:bg-muted'
          }`}
        >
          {day}
        </button>
      );
    }
    return cells;
  };

  const getDisplayValue = () => {
    if (!value) return '';
    if (!value.includes('T')) return value;
    const [datePart, timePart] = value.split('T');
    const d = new Date(datePart);
    if (isNaN(d.getTime())) return value;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${timePart}`;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          readOnly
          required={required}
          disabled={disabled}
          value={getDisplayValue()}
          placeholder={placeholder}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`h-11 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15 cursor-pointer text-left disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed ${className}`}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 rounded-[2rem] border border-border bg-card p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col md:flex-row gap-4 w-[460px] max-w-[95vw] md:w-[480px]">
          {/* Calendar side */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="size-8 flex items-center justify-center rounded-xl border border-border hover:bg-muted text-foreground transition cursor-pointer"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-sm font-black text-foreground">
                {monthsVietnamese[currentMonth]}, {currentYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="size-8 flex items-center justify-center rounded-xl border border-border hover:bg-muted text-foreground transition cursor-pointer"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 text-center text-xs font-bold text-muted-foreground mb-2">
              <div>CN</div>
              <div>T2</div>
              <div>T3</div>
              <div>T4</div>
              <div>T5</div>
              <div>T6</div>
              <div>T7</div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {renderCells()}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-border" />

          {/* Time Picker side */}
          <div className="w-full md:w-36 flex flex-col h-full justify-between">
            <div className="flex gap-2 h-48 md:h-52">
              {/* Hour */}
              <div className="flex-1 flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground text-center uppercase tracking-wider mb-2">Giờ</span>
                <div ref={hourRef} className="flex-grow overflow-y-auto max-h-44 scrollbar-none flex flex-col gap-1 pr-1">
                  {hours.map(h => {
                    const isActive = selectedHour === h;
                    return (
                      <button
                        key={`dt-h-${h}`}
                        type="button"
                        data-active={isActive}
                        onClick={() => setSelectedHour(h)}
                        className={`py-1 rounded-xl text-xs font-semibold transition cursor-pointer select-none text-center ${
                          isActive 
                            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25' 
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minute */}
              <div className="flex-1 flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground text-center uppercase tracking-wider mb-2">Phút</span>
                <div ref={minuteRef} className="flex-grow overflow-y-auto max-h-44 scrollbar-none flex flex-col gap-1 pl-1">
                  {minutes.map(m => {
                    const isActive = selectedMinute === m;
                    return (
                      <button
                        key={`dt-m-${m}`}
                        type="button"
                        data-active={isActive}
                        onClick={() => setSelectedMinute(m)}
                        className={`py-1 rounded-xl text-xs font-semibold transition cursor-pointer select-none text-center ${
                          isActive 
                            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25' 
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Confirm button */}
            <button
              type="button"
              onClick={handleConfirm}
              className="mt-4 w-full py-2 bg-primary text-primary-foreground rounded-full font-bold text-sm hover:bg-primary/95 transition cursor-pointer flex items-center justify-center gap-1 active:translate-y-px"
            >
              <Check className="size-4" />
              Xác nhận
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
