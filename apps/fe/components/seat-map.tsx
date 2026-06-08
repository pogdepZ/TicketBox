"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Seat, TicketZone } from '@/lib/mock-data';
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

  const zoneSeats = useMemo(
    () => seats.filter((seat) => seat.zoneId === selectedZone?.id),
    [seats, selectedZone?.id],
  );

  const selectedSeats = useMemo(
    () => seats.filter((seat) => selectedSeatIds.includes(seat.id)),
    [seats, selectedSeatIds],
  );

  function handleSelectZone(zone: TicketZone) {
    if (zone.status === 'sold-out') {
      return;
    }

    setSelectedZone(zone);
    setSelectedSeatIds([]);
  }

  function handleContinueToSeats() {
    if (!selectedZone || selectedZone.status === 'sold-out') {
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
  const primaryDisabled = step === 'overview' ? !selectedZone : selectedSeats.length === 0;
  const primaryAction = step === 'overview' ? handleContinueToSeats : () => {
    if (!selectedZone || selectedSeats.length === 0) {
      return;
    }

    createDraftReservation({
      concertId,
      concertTitle,
      selectedZone,
      selectedSeats,
    });
    router.push('/checkout');
  };

  const summary = (
    <OrderSummary
      concertTitle={concertTitle}
      selectedZone={selectedZone}
      selectedSeats={selectedSeats}
      primaryLabel={primaryLabel}
      primaryDisabled={primaryDisabled}
      onPrimaryAction={primaryAction}
      onChangeZone={selectedZone ? handleBackToOverview : undefined}
    />
  );

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {step === 'overview' ? (
          <VenueMapOverview
            zones={zones}
            selectedZone={selectedZone}
            onSelectZone={handleSelectZone}
          />
        ) : selectedZone ? (
          <ZoneSeatMap
            zone={selectedZone}
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
          selectedZone={selectedZone}
          selectedSeats={selectedSeats}
          primaryLabel={primaryLabel}
          primaryDisabled={primaryDisabled}
          onPrimaryAction={primaryAction}
          onChangeZone={selectedZone ? handleBackToOverview : undefined}
          compact
        />
      </div>
    </div>
  );
}
