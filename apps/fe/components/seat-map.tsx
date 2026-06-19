"use client";

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Seat, TicketZone, TicketZoneStatus } from '@/lib/mock-data';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { VenueMapOverview } from '@/components/seat-map/VenueMapOverview';
import { ZoneSeatMap } from '@/components/seat-map/ZoneSeatMap';
import { createDraftReservation } from '@/lib/mock-reservation';

interface SeatMapProps {
  concertId: string;
  concertTitle: string;
  zones: TicketZone[];
  seats: Seat[];
}

type FlowStep = 'overview' | 'seats';

export function SeatMap({ concertId, concertTitle, zones, seats }: SeatMapProps) {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>('overview');
  const [selectedZone, setSelectedZone] = useState<TicketZone | undefined>();
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [currentZones, setCurrentZones] = useState<TicketZone[]>(zones);

  useEffect(() => {
    setCurrentZones(zones);
  }, [zones]);

  // Real-time simulated updates for ticket availability
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentZones((prevZones) => {
        // Find zones that still have tickets
        const availableZones = prevZones.filter((z) => z.remaining > 0);
        if (availableZones.length === 0) return prevZones;

        // Choose 1 or 2 random zones to decrease their remaining tickets
        const numZonesToUpdate = Math.min(availableZones.length, Math.random() > 0.5 ? 2 : 1);
        const shuffled = [...availableZones].sort(() => 0.5 - Math.random());
        const targetZones = shuffled.slice(0, numZonesToUpdate);

        return prevZones.map((zone) => {
          const target = targetZones.find((tz) => tz.id === zone.id);
          if (target) {
            // Decrease by 1 or 2 tickets
            const decrement = Math.random() > 0.7 ? 2 : 1;
            const newRemaining = Math.max(0, zone.remaining - decrement);
            
            let status = zone.status;
            if (newRemaining === 0) {
              status = 'sold-out';
            } else if (newRemaining / zone.total <= 0.15) {
              status = 'limited';
            }

            return {
              ...zone,
              remaining: newRemaining,
              status: status as TicketZoneStatus,
            };
          }
          return zone;
        });
      });
    }, 4000); // update every 4 seconds

    return () => clearInterval(timer);
  }, []);

  const activeSelectedZone = useMemo(() => {
    return selectedZone ? currentZones.find((z) => z.id === selectedZone.id) : undefined;
  }, [selectedZone, currentZones]);

  const zoneSeats = useMemo(
    () => seats.filter((seat) => seat.zoneId === activeSelectedZone?.id),
    [seats, activeSelectedZone?.id],
  );

  const selectedSeats = useMemo(
    () => seats.filter((seat) => selectedSeatIds.includes(seat.id)),
    [seats, selectedSeatIds],
  );

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

  const primaryLabel = step === 'overview' ? 'Tiếp tục chọn ghế' : 'Tiếp tục thanh toán';
  const primaryDisabled = step === 'overview' ? !activeSelectedZone : selectedSeats.length === 0;
  const primaryAction = step === 'overview' ? handleContinueToSeats : () => {
    if (!activeSelectedZone || selectedSeats.length === 0) {
      return;
    }

    createDraftReservation({
      concertId,
      concertTitle,
      selectedZone: activeSelectedZone,
      selectedSeats,
    });
    router.push('/checkout');
  };

  const summary = (
    <OrderSummary
      concertTitle={concertTitle}
      selectedZone={activeSelectedZone}
      selectedSeats={selectedSeats}
      primaryLabel={primaryLabel}
      primaryDisabled={primaryDisabled}
      onPrimaryAction={primaryAction}
      onChangeZone={activeSelectedZone ? handleBackToOverview : undefined}
    />
  );

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {step === 'overview' ? (
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
        ) : null}
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
          onChangeZone={activeSelectedZone ? handleBackToOverview : undefined}
          compact
        />
      </div>
    </div>
  );
}
