"use client";

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Map, Zap } from 'lucide-react';
import type { Seat, TicketZone, TicketZoneStatus } from '@/lib/types';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { VenueMapOverview } from '@/components/seat-map/VenueMapOverview';
import { ZoneSeatMap } from '@/components/seat-map/ZoneSeatMap';
import { InteractiveSeatMap } from '@/components/seat-map/InteractiveSeatMap';
import { createDraftReservation } from '@/lib/draft-reservation';
import { createOrder, getFriendlyErrorMessage, fetchApi } from '@/lib/api';

interface SeatMapProps {
  concertId: string;
  concertTitle: string;
  zones: TicketZone[];
  seats: Seat[];
  svgContent?: string;
}

type FlowStep = 'overview' | 'seats';

interface SvgSeatState {
  label: string;
  zoneCode: string;
}

export function SeatMap({ concertId, concertTitle, zones, seats, svgContent }: SeatMapProps) {
  const router = useRouter();

  // Layout mode state
  const [layoutMode, setLayoutMode] = useState<'map' | 'quick'>('map');
  const [quickZoneId, setQuickZoneId] = useState<string | null>(null);
  const [quickQuantity, setQuickQuantity] = useState<number>(1);

  // Legacy layout states (Fallback)
  const [step, setStep] = useState<FlowStep>('overview');
  const [selectedZone, setSelectedZone] = useState<TicketZone | undefined>();
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [currentZones, setCurrentZones] = useState<TicketZone[]>(zones);

  // SVG layout states
  const [selectedSvgSeats, setSelectedSvgSeats] = useState<SvgSeatState[]>([]);
  const [reservedSeats, setReservedSeats] = useState<Array<{ seatNumber: string; status: string }>>([]);

  useEffect(() => {
    setCurrentZones(zones);
  }, [zones]);

  // SVG: Fetch real-time reserved/held seats
  useEffect(() => {
    if (!svgContent) return;

    let isMounted = true;
    async function loadReserved() {
      try {
        const res = await fetchApi(`/concerts/${concertId}/reserved-seats`);
        if (isMounted && Array.isArray(res)) {
          setReservedSeats(res);
        }
      } catch (e) {
        console.error("Failed to load reserved seats:", e);
      }
    }

    loadReserved();
    const interval = setInterval(loadReserved, 10000); // poll every 10s

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [concertId, svgContent]);

  // Auto seat selection in Quick Select Mode
  useEffect(() => {
    if (layoutMode !== 'quick') return;
    
    // Choose active zone: either selected one or the first available one
    const activeZone = currentZones.find((z) => z.id === quickZoneId) || currentZones.find((z) => z.status !== 'sold-out');
    if (!activeZone) return;

    if (!quickZoneId || quickZoneId !== activeZone.id) {
      setQuickZoneId(activeZone.id);
      return;
    }

    // Filter available seats in this zone
    let availableSeats = seats.filter((s) => s.zoneId === activeZone.id && s.status === 'available');
    
    if (svgContent) {
      // For SVG, cross-reference with live reserved seats
      const reservedLabels = new Set(reservedSeats.map((r) => r.seatNumber.toUpperCase()));
      availableSeats = availableSeats.filter((s) => !reservedLabels.has(s.label.toUpperCase()));
    }

    // Auto-select the first N available seats
    const selectedForQuick = availableSeats.slice(0, quickQuantity);

    if (svgContent) {
      setSelectedSvgSeats(
        selectedForQuick.map((s) => ({
          label: s.label,
          zoneCode: activeZone.code || activeZone.id,
        }))
      );
    } else {
      setSelectedSeatIds(selectedForQuick.map((s) => s.id));
      setSelectedZone(activeZone);
    }
  }, [layoutMode, quickZoneId, quickQuantity, seats, currentZones, svgContent, reservedSeats]);

  // Determine which zone is currently active (being selected)
  const activeSelectedZone = useMemo(() => {
    if (layoutMode === 'quick') {
      return currentZones.find((z) => z.id === quickZoneId);
    }
    if (svgContent) {
      if (selectedSvgSeats.length === 0) return undefined;
      const firstSeat = selectedSvgSeats[0];
      return currentZones.find((z) => (z.code || "").toLowerCase() === firstSeat.zoneCode.toLowerCase());
    } else {
      return selectedZone ? currentZones.find((z) => z.id === selectedZone.id) : undefined;
    }
  }, [selectedZone, currentZones, svgContent, selectedSvgSeats, layoutMode, quickZoneId]);

  // Legacy: Seats belonging to active zone
  const zoneSeats = useMemo(
    () => seats.filter((seat) => seat.zoneId === activeSelectedZone?.id),
    [seats, activeSelectedZone?.id],
  );

  // Selected seats mapping to Seat[] format
  const selectedSeats = useMemo(() => {
    if (layoutMode === 'quick') {
      if (svgContent) {
        return selectedSvgSeats.map((s) => {
          const zone = currentZones.find((z) => (z.code || "").toLowerCase() === s.zoneCode.toLowerCase());
          return {
            id: `seat-${concertId}-${zone?.id || s.zoneCode}-${s.label}`,
            row: s.label.replace(/[0-9]/g, ''),
            number: parseInt(s.label.replace(/[^0-9]/g, '')) || 1,
            label: s.label,
            status: 'available' as const,
            zoneId: zone?.id || '',
            seatZoneId: zone?.id || '',
            ticketTypeId: zone?.ticketTypeId || zone?.id || '',
          };
        });
      } else {
        return seats.filter((seat) => selectedSeatIds.includes(seat.id));
      }
    }
    if (svgContent) {
      return selectedSvgSeats.map((s) => {
        const zone = currentZones.find((z) => (z.code || "").toLowerCase() === s.zoneCode.toLowerCase());
        return {
          id: `seat-${concertId}-${zone?.id || s.zoneCode}-${s.label}`,
          row: s.label.replace(/[0-9]/g, ''), // extract row letter
          number: parseInt(s.label.replace(/[^0-9]/g, '')) || 1, // extract number
          label: s.label,
          status: 'available' as const,
          zoneId: zone?.id || '',
          seatZoneId: zone?.id || '',
          ticketTypeId: zone?.ticketTypeId || zone?.id || '',
        };
      });
    } else {
      return seats.filter((seat) => selectedSeatIds.includes(seat.id));
    }
  }, [seats, selectedSeatIds, svgContent, selectedSvgSeats, currentZones, concertId, layoutMode]);

  // Legacy event handlers
  function handleSelectZone(zone: TicketZone) {
    const currentZoneState = currentZones.find((z) => z.id === zone.id);
    if (!currentZoneState || currentZoneState.status === 'sold-out') {
      return;
    }
    setSelectedZone(currentZoneState);
    setSelectedSeatIds([]);
  }

  function handleContinueToSeats() {
    if (!activeSelectedZone || activeSelectedZone.status === 'sold-out') {
      return;
    }
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('access_token') : null;
    if (!token) {
      window.dispatchEvent(
        new CustomEvent('ticketbox-toast', {
          detail: {
            title: 'Yêu cầu đăng nhập',
            message: 'Vui lòng đăng nhập trước khi thực hiện chọn ghế.',
            type: 'error',
          },
        })
      );
      router.push(`/login?redirect=/concert/${concertId}`);
      return;
    }
    setStep('seats');
  }

  function handleBackToOverview() {
    setStep('overview');
    setSelectedSeatIds([]);
  }

  function handleToggleSeat(seat: Seat) {
    if (seat.status !== 'available') {
      return;
    }
    setSelectedSeatIds((current) => {
      const exists = current.includes(seat.id);
      if (exists) {
        return current.filter((seatId) => seatId !== seat.id);
      } else {
        const maxLimit = activeSelectedZone && activeSelectedZone.maxPerUser !== undefined ? activeSelectedZone.maxPerUser : Infinity;
        if (maxLimit !== Infinity && current.length >= maxLimit) {
          window.dispatchEvent(
            new CustomEvent('ticketbox-toast', {
              detail: {
                title: 'Giới hạn số lượng',
                message: `Bạn chỉ được đặt tối đa ${maxLimit} vé cho hạng vé này.`,
                type: 'error',
              },
            })
          );
          return current;
        }
        return [...current, seat.id];
      }
    });
  }

  // SVG event handlers
  function handleToggleSvgSeat(seatLabel: string, zoneCode: string) {
    setSelectedSvgSeats((current) => {
      const exists = current.some((s) => s.label.toUpperCase() === seatLabel.toUpperCase());
      if (exists) {
        return current.filter((s) => s.label.toUpperCase() !== seatLabel.toUpperCase());
      } else {
        const zone = currentZones.find((z) => (z.code || "").toLowerCase() === zoneCode.toLowerCase());
        const maxLimit = zone && zone.maxPerUser !== undefined ? zone.maxPerUser : Infinity;
        
        if (maxLimit !== Infinity && current.length >= maxLimit) {
          window.dispatchEvent(
            new CustomEvent('ticketbox-toast', {
              detail: {
                title: 'Giới hạn số lượng',
                message: `Bạn chỉ được đặt tối đa ${maxLimit} vé cho hạng vé này.`,
                type: 'error',
              },
            })
          );
          return current;
        }
        return [...current, { label: seatLabel, zoneCode }];
      }
    });
  }

  const [isSubmitting, setIsSubmitting] = useState(false);

  const primaryLabel = isSubmitting 
    ? 'Đang giữ ghế...' 
    : (layoutMode === 'quick' ? 'Tiếp tục thanh toán' : (svgContent ? 'Tiếp tục thanh toán' : (step === 'overview' ? 'Tiếp tục chọn ghế' : 'Tiếp tục thanh toán')));

  const primaryDisabled = isSubmitting || (layoutMode === 'quick' ? selectedSeats.length === 0 : (svgContent ? selectedSeats.length === 0 : (step === 'overview' ? !activeSelectedZone : selectedSeats.length === 0)));

  const primaryAction = layoutMode === 'quick' ? async () => {
    if (!activeSelectedZone || selectedSeats.length === 0 || isSubmitting) return;
    
    // Auth check before booking
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('access_token') : null;
    if (!token) {
      window.dispatchEvent(
        new CustomEvent('ticketbox-toast', {
          detail: {
            title: 'Yêu cầu đăng nhập',
            message: 'Vui lòng đăng nhập trước khi thực hiện thanh toán.',
            type: 'error',
          },
        })
      );
      router.push(`/login?redirect=/concert/${concertId}/booking`);
      return;
    }

    setIsSubmitting(true);
    try {
      createDraftReservation({
        concertId,
        concertTitle,
        zones: currentZones,
        selectedSeats,
      });
      router.push(`/checkout?t=${Date.now()}`);
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('ticketbox-toast', {
          detail: {
            title: 'Lỗi đặt vé',
            message: getFriendlyErrorMessage(err),
            type: 'error',
          },
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  } : (!svgContent && step === 'overview' ? handleContinueToSeats : async () => {
    if (!activeSelectedZone || selectedSeats.length === 0 || isSubmitting) {
      return;
    }

    // Auth check before booking
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('access_token') : null;
    if (!token) {
      window.dispatchEvent(
        new CustomEvent('ticketbox-toast', {
          detail: {
            title: 'Yêu cầu đăng nhập',
            message: 'Vui lòng đăng nhập trước khi thực hiện thanh toán.',
            type: 'error',
          },
        })
      );
      router.push(`/login?redirect=/concert/${concertId}/booking`);
      return;
    }

    setIsSubmitting(true);
    try {
      createDraftReservation({
        concertId,
        concertTitle,
        zones: currentZones,
        selectedSeats,
      });
      router.push(`/checkout?t=${Date.now()}`);
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('ticketbox-toast', {
          detail: {
            title: 'Lỗi đặt vé',
            message: getFriendlyErrorMessage(err),
            type: 'error',
          },
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  const summary = (
    <OrderSummary
      concertTitle={concertTitle}
      selectedZone={activeSelectedZone}
      selectedSeats={selectedSeats}
      primaryLabel={primaryLabel}
      primaryDisabled={primaryDisabled}
      onPrimaryAction={primaryAction}
      onChangeZone={!svgContent && activeSelectedZone && layoutMode !== 'quick' ? handleBackToOverview : undefined}
      zones={currentZones}
    />
  );

  return (
    <div className="space-y-4">
      {/* Layout Selector Bar */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-full bg-muted p-1 border border-border">
          <button
            type="button"
            onClick={() => {
              setLayoutMode('map');
              setSelectedSeatIds([]);
              setSelectedSvgSeats([]);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              layoutMode === 'map' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Map className="size-3.5" />
            Sơ đồ ghế
          </button>
          <button
            type="button"
            onClick={() => {
              setLayoutMode('quick');
              setSelectedSeatIds([]);
              setSelectedSvgSeats([]);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              layoutMode === 'quick' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="size-3.5" />
            Chọn nhanh (Không sơ đồ)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {layoutMode === 'quick' ? (
            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-8">
              <div className="mb-6">
                <p className="text-sm font-bold text-primary">Mua vé nhanh</p>
                <h2 className="text-2xl font-black tracking-tight text-foreground">Chọn hạng vé & Số lượng</h2>
                <p className="mt-2 text-muted-foreground text-sm">
                  Hệ thống sẽ tự động giữ những vị trí tốt nhất còn trống trong phân khu của bạn.
                </p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentZones.map((zone) => {
                    const isSelected = quickZoneId === zone.id;
                    const isSoldOut = zone.status === 'sold-out';
                    
                    return (
                      <button
                        key={zone.id}
                        type="button"
                        disabled={isSoldOut}
                        onClick={() => {
                          setQuickZoneId(zone.id);
                          setQuickQuantity(1);
                        }}
                        className={`text-left p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-36 cursor-pointer ${
                          isSoldOut
                            ? 'border-border opacity-40 cursor-not-allowed bg-muted/20'
                            : isSelected
                            ? 'border-primary bg-primary/5 shadow-md shadow-primary/5'
                            : 'border-border hover:border-primary/45 bg-card hover:bg-muted/10'
                        }`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <span
                            className="text-xs font-black uppercase px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${zone.color}20`, color: zone.color }}
                          >
                            {zone.name}
                          </span>
                          {isSoldOut && (
                            <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              Hết vé
                            </span>
                          )}
                        </div>

                        <div className="mt-4">
                          <p className="text-lg font-black text-foreground">{Number(zone.price).toLocaleString('vi-VN')}đ</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{zone.description || 'Không có mô tả thêm'}</p>
                        </div>
                        
                        {isSelected && (
                          <div className="absolute left-0 bottom-0 top-0 w-1.5 bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {quickZoneId && (
                  <div className="rounded-2xl border border-border bg-muted/20 p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Số lượng vé</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tối đa {currentZones.find(z => z.id === quickZoneId)?.maxPerUser || 4} vé mỗi giao dịch.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 bg-card border border-border rounded-full p-1.5">
                      <button
                        type="button"
                        disabled={quickQuantity <= 1}
                        onClick={() => setQuickQuantity(q => q - 1)}
                        className="size-8 rounded-full border border-border flex items-center justify-center font-bold text-foreground hover:border-primary/50 hover:text-primary transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-black text-foreground">{quickQuantity}</span>
                      <button
                        type="button"
                        disabled={
                          quickQuantity >= (currentZones.find(z => z.id === quickZoneId)?.maxPerUser || 4) ||
                          quickQuantity >= seats.filter(s => s.zoneId === quickZoneId && s.status === 'available').length
                        }
                        onClick={() => setQuickQuantity(q => q + 1)}
                        className="size-8 rounded-full border border-border flex items-center justify-center font-bold text-foreground hover:border-primary/50 hover:text-primary transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : svgContent ? (
            <div className="space-y-6">
              <div className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-8">
                <div className="mb-6">
                  <p className="text-sm font-bold text-primary">Sơ đồ vị trí</p>
                  <h2 className="text-2xl font-black tracking-tight text-foreground">Chọn vị trí ghế ngồi của bạn</h2>
                  <p className="mt-2 max-w-2xl text-muted-foreground">
                    Phóng to sơ đồ, click chuột vào chiếc ghế mong muốn. Các ghế màu xám là ghế đã được bán hoặc đang giữ.
                  </p>
                </div>

                <InteractiveSeatMap
                  svgContent={svgContent}
                  zones={currentZones}
                  selectedSeatLabels={selectedSvgSeats.map((s) => s.label)}
                  reservedSeats={reservedSeats}
                  onToggleSeat={handleToggleSvgSeat}
                />
              </div>
            </div>
          ) : (
            step === 'overview' ? (
              <VenueMapOverview
                zones={currentZones}
                selectedZone={activeSelectedZone}
                onSelectZone={handleSelectZone}
              />
            ) : activeSelectedZone ? (
              <ZoneSeatMap
                zone={activeSelectedZone}
                seats={zoneSeats}
                selectedSeatIds={selectedSeatIds}
                onToggleSeat={handleToggleSeat}
                onBack={handleBackToOverview}
              />
            ) : null
          )}
        </div>

        <aside className="hidden lg:block">{summary}</aside>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
          <OrderSummary
            concertTitle={concertTitle}
            selectedZone={activeSelectedZone}
            selectedSeats={selectedSeats}
            primaryLabel={primaryLabel}
            primaryDisabled={primaryDisabled}
            onPrimaryAction={primaryAction}
            onChangeZone={!svgContent && activeSelectedZone && layoutMode !== 'quick' ? handleBackToOverview : undefined}
            compact
          />
        </div>
      </div>
    </div>
  );
}
