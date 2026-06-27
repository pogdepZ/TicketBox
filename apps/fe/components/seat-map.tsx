"use client";

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Seat, TicketZone, TicketZoneStatus } from '@/lib/mock-data';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { VenueMapOverview } from '@/components/seat-map/VenueMapOverview';
import { ZoneSeatMap } from '@/components/seat-map/ZoneSeatMap';
import { InteractiveSeatMap } from '@/components/seat-map/InteractiveSeatMap';
import { createDraftReservation } from '@/lib/mock-reservation';
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

  // Determine which zone is currently active (being selected)
  const activeSelectedZone = useMemo(() => {
    if (svgContent) {
      if (selectedSvgSeats.length === 0) return undefined;
      const firstSeat = selectedSvgSeats[0];
      return currentZones.find((z) => (z.code || "").toLowerCase() === firstSeat.zoneCode.toLowerCase());
    } else {
      return selectedZone ? currentZones.find((z) => z.id === selectedZone.id) : undefined;
    }
  }, [selectedZone, currentZones, svgContent, selectedSvgSeats]);

  // Legacy: Seats belonging to active zone
  const zoneSeats = useMemo(
    () => seats.filter((seat) => seat.zoneId === activeSelectedZone?.id),
    [seats, activeSelectedZone?.id],
  );

  // Selected seats mapping to Seat[] format
  const selectedSeats = useMemo(() => {
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
  }, [seats, selectedSeatIds, svgContent, selectedSvgSeats, currentZones, concertId]);

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
    setSelectedSeatIds((current) =>
      current.includes(seat.id)
        ? current.filter((seatId) => seatId !== seat.id)
        : [...current, seat.id],
    );
  }

  // SVG event handlers
  function handleToggleSvgSeat(seatLabel: string, zoneCode: string) {
    setSelectedSvgSeats((current) => {
      const exists = current.some((s) => s.label.toUpperCase() === seatLabel.toUpperCase());
      if (exists) {
        return current.filter((s) => s.label.toUpperCase() !== seatLabel.toUpperCase());
      } else {
        const zone = currentZones.find((z) => (z.code || "").toLowerCase() === zoneCode.toLowerCase());
        const maxLimit = zone ? zone.maxPerUser : 4;
        
        if (current.length >= maxLimit) {
          window.dispatchEvent(
            new CustomEvent('ticketbox-toast', {
              detail: {
                title: 'Giới hạn số lượng',
                message: `Bạn chỉ được đặt tối đa ${maxLimit} vé cho mỗi giao dịch.`,
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
    : (svgContent ? 'Tiếp tục thanh toán' : (step === 'overview' ? 'Tiếp tục chọn ghế' : 'Tiếp tục thanh toán'));

  const primaryDisabled = isSubmitting || (svgContent ? selectedSeats.length === 0 : (step === 'overview' ? !activeSelectedZone : selectedSeats.length === 0));

  const primaryAction = !svgContent && step === 'overview' ? handleContinueToSeats : async () => {
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
      const idempotencyKey = typeof window !== 'undefined' && window.crypto?.randomUUID 
        ? window.crypto.randomUUID() 
        : `idempotency-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Phân nhóm ghế theo ticketTypeId để hỗ trợ đặt nhiều loại vé khác nhau
      const itemsMap = new Map<string, string[]>();
      selectedSeats.forEach((s) => {
        const tId = s.ticketTypeId || s.zoneId;
        if (tId) {
          const currentSeats = itemsMap.get(tId) || [];
          itemsMap.set(tId, [...currentSeats, s.label]);
        }
      });

      const items = Array.from(itemsMap.entries()).map(([ticketTypeId, seatNumbers]) => ({
        ticketTypeId,
        seatNumbers,
      }));

      const payload = {
        concertId,
        items,
        ticketTypeId: items[0]?.ticketTypeId,
        seatNumbers: selectedSeats.map((s) => s.label),
      };

      const orderResponse = await createOrder(payload, idempotencyKey);

      const orderId = orderResponse.orderId || orderResponse.data?.orderId || orderResponse.id;
      if (!orderId) {
        throw new Error('Không nhận được Mã đơn hàng từ hệ thống.');
      }

      createDraftReservation({
        concertId,
        concertTitle,
        selectedZone: activeSelectedZone,
        selectedSeats,
      });
      router.push(`/checkout?orderId=${orderId}`);
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('ticketbox-toast', {
          detail: {
            title: 'Không thể giữ ghế',
            message: getFriendlyErrorMessage(err),
            type: 'error',
          },
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const summary = (
    <OrderSummary
      concertTitle={concertTitle}
      selectedZone={activeSelectedZone}
      selectedSeats={selectedSeats}
      primaryLabel={primaryLabel}
      primaryDisabled={primaryDisabled}
      onPrimaryAction={primaryAction}
      onChangeZone={!svgContent && activeSelectedZone ? handleBackToOverview : undefined}
      zones={currentZones}
    />
  );

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {svgContent ? (
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
          onChangeZone={!svgContent && activeSelectedZone ? handleBackToOverview : undefined}
          compact
        />
      </div>
    </div>
  );
}
