"use client";

import { useEffect, useRef, useState, MouseEvent } from "react";
import type { TicketZone } from "@/lib/mock-data";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface InteractiveSeatMapProps {
  svgContent: string;
  zones: TicketZone[];
  selectedSeatLabels: string[];
  reservedSeats: Array<{ seatNumber: string; status: string }>;
  onToggleSeat: (seatLabel: string, zoneCode: string) => void;
}

interface HoveredSeatInfo {
  label: string;
  zoneName: string;
  price: number;
  x: number;
  y: number;
}

export function InteractiveSeatMap({
  svgContent,
  zones,
  selectedSeatLabels,
  reservedSeats,
  onToggleSeat,
}: InteractiveSeatMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgWrapperRef = useRef<HTMLDivElement>(null);

  // Zoom & Pan states
  const [scale, setScale] = useState(0.5);
  const [position, setPosition] = useState({ x: 100, y: 10 });
  const [isDragging, setIsDragging] = useState(false);

  // Keep a ref of position and scale to avoid stale closure issues in global event listeners
  const transformRef = useRef({ x: 100, y: 10, scale: 0.5 });
  
  useEffect(() => {
    transformRef.current = { x: position.x, y: position.y, scale };
  }, [position, scale]);



  // Map zone data by code for quick lookup
  const zonesByCode = zones.reduce((acc, zone) => {
    const code = (zone.code || "").toLowerCase();
    acc[code] = zone;
    return acc;
  }, {} as Record<string, TicketZone>);

  // Reserved seats set for quick lookup
  const reservedMap = reservedSeats.reduce((acc, seat) => {
    acc[seat.seatNumber.toUpperCase()] = seat.status;
    return acc;
  }, {} as Record<string, string>);

  // Effect: Auto-fit and center the SVG when it mounts or content changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.clientWidth || 800;
    const containerHeight = 650;
    const svgWidth = 800;
    const svgHeight = 1250;
    
    // Fit SVG height to container height with a small padding
    const fitScale = Math.min((containerHeight - 40) / svgHeight, 1);
    const initX = (containerWidth - svgWidth * fitScale) / 2;
    const initY = 20; // top padding
    
    setScale(fitScale);
    setPosition({ x: initX, y: initY });
  }, [svgContent]);

  // Effect: Register non-passive wheel event listener to fully prevent page scroll while zooming
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleRawWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault(); // Stop page scroll
      
      const zoomFactor = 1.08;
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setScale((prevScale) => {
        let nextScale = prevScale;
        if (e.deltaY < 0) {
          nextScale = Math.min(prevScale * zoomFactor, 3); // Max zoom 3x
        } else {
          nextScale = Math.max(prevScale / zoomFactor, 0.4); // Min zoom 0.4x
        }

        if (nextScale !== prevScale) {
          setPosition((prevPos) => {
            // Calculate mouse position inside SVG coordinates
            const svgX = (mouseX - prevPos.x) / prevScale;
            const svgY = (mouseY - prevPos.y) / prevScale;

            // Adjust position so the point under the mouse cursor remains in place after zoom
            return {
              x: mouseX - svgX * nextScale,
              y: mouseY - svgY * nextScale,
            };
          });
        }
        return nextScale;
      });
    };

    container.addEventListener("wheel", handleRawWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleRawWheel);
    };
  }, []);

  // Effect: Handle Pan (Drag) globally on window for butter-smooth movement
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let localIsDragging = false;
    let dragStartOffset = { x: 0, y: 0 };

    const handleMouseDown = (e: globalThis.MouseEvent) => {
      const target = e.target as HTMLElement;
      // Do not initiate drag if clicking on an interactive seat
      if (target.hasAttribute("data-seat-number")) return;

      localIsDragging = true;
      setIsDragging(true);

      const currentX = transformRef.current.x;
      const currentY = transformRef.current.y;
      
      dragStartOffset = {
        x: e.clientX - currentX,
        y: e.clientY - currentY,
      };

      window.addEventListener("mousemove", handleMouseMove, { passive: true });
      window.addEventListener("mouseup", handleMouseUp);
    };

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!localIsDragging) return;
      
      const newX = e.clientX - dragStartOffset.x;
      const newY = e.clientY - dragStartOffset.y;
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      localIsDragging = false;
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    container.addEventListener("mousedown", handleMouseDown);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Effect: Update seat classes/styles in the parsed SVG DOM whenever selection or reservation changes
  useEffect(() => {
    if (!svgWrapperRef.current) return;

    // Find all seat elements in SVG
    const svgEl = svgWrapperRef.current.querySelector("svg");
    if (!svgEl) return;

    const seats = svgEl.querySelectorAll("[data-seat-number]");
    seats.forEach((seatNode) => {
      const seatNum = (seatNode.getAttribute("data-seat-number") || "").toUpperCase();
      const zoneCode = (seatNode.getAttribute("data-zone-code") || "").toLowerCase();

      // Reset classes & inline styles
      seatNode.removeAttribute("style");
      seatNode.classList.remove("seat-selected", "seat-disabled", "seat-held");

      const status = reservedMap[seatNum];
      const isSelected = selectedSeatLabels.includes(seatNum);

      if (status === "CONFIRMED") {
        // Sold out
        seatNode.classList.add("seat-disabled");
        seatNode.setAttribute("style", "fill: #475569 !important; opacity: 0.25 !important; cursor: not-allowed !important; pointer-events: none !important;");
      } else if (status === "HELD") {
        // Held by another session
        seatNode.classList.add("seat-held");
        seatNode.setAttribute("style", "fill: #64748b !important; opacity: 0.45 !important; cursor: not-allowed !important; pointer-events: none !important;");
      } else if (isSelected) {
        // Selected by current user
        seatNode.classList.add("seat-selected");
        seatNode.setAttribute("style", "fill: #ffffff !important; stroke: #3b82f6 !important; stroke-width: 2.5px !important; opacity: 1 !important; filter: drop-shadow(0 0 6px #3b82f6); cursor: pointer;");
      } else {
        // Normal interactive seat
        seatNode.setAttribute("style", "cursor: pointer; transition: fill 0.2s, opacity 0.2s;");
      }
    });
  }, [svgContent, selectedSeatLabels, reservedMap]);



  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev / 1.2, 0.4));
  };

  const handleReset = () => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth || 800;
    const containerHeight = 650;
    const svgWidth = 800;
    const svgHeight = 1250;
    
    const fitScale = Math.min((containerHeight - 40) / svgHeight, 1);
    const initX = (containerWidth - svgWidth * fitScale) / 2;
    const initY = 20;
    
    setScale(fitScale);
    setPosition({ x: initX, y: initY });
  };

  // Event handler: Seat Selection Click
  const handleSvgClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as SVGElement;
    const seatNumber = target.getAttribute("data-seat-number");
    const zoneCode = target.getAttribute("data-zone-code");

    if (seatNumber && zoneCode) {
      const normalizedSeat = seatNumber.toUpperCase();
      const status = reservedMap[normalizedSeat];
      if (status === "CONFIRMED" || status === "HELD") return;

      onToggleSeat(seatNumber, zoneCode);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_100%)] shadow-inner">
      {/* Zoom / Pan Action Toolbar */}
      <div className="absolute left-4 top-4 z-10 flex gap-2 rounded-xl border border-white/10 bg-slate-900/80 p-1.5 backdrop-blur-md">
        <button
          type="button"
          onClick={handleZoomIn}
          className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
          title="Phóng to"
        >
          <ZoomIn className="size-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
          title="Thu nhỏ"
        >
          <ZoomOut className="size-4" />
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
          title="Khôi phục góc nhìn"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>

      {/* SVG Canvas Container */}
      <div
        ref={containerRef}
        onClick={handleSvgClick}
        className={`relative h-[650px] w-full select-none overflow-hidden ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div
          ref={svgWrapperRef}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "0 0", // crucial for correct zoom-to-cursor math
            transition: isDragging ? "none" : "transform 0.08s ease-out",
            willChange: "transform",
          }}
          className="absolute left-0 top-0 pointer-events-auto"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />


      </div>

      {/* Helper Guideline overlay bottom left */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-col gap-1 rounded-xl bg-slate-900/60 p-2 text-[10px] text-slate-400 backdrop-blur-sm">
        <p>• Dùng cuộn chuột để Phóng to / Thu nhỏ (Zoom vào vị trí con trỏ chuột)</p>
        <p>• Kéo giữ chuột trên nền để di chuyển sơ đồ</p>
        <p>• Click chuột vào các ghế trống để chọn chỗ</p>
      </div>
    </div>
  );
}
