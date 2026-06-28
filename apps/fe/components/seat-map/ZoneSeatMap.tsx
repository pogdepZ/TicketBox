import { ArrowLeft } from 'lucide-react';
import type { Seat, SeatStatus, TicketZone } from '@/lib/types';
import { SeatButton } from './SeatButton';
import { SeatLegend } from './SeatLegend';

interface ZoneSeatMapProps {
  zone: TicketZone;
  seats: Seat[];
  selectedSeatIds: string[];
  onToggleSeat: (seat: Seat) => void;
  onBack: () => void;
}

export function ZoneSeatMap({ zone, seats, selectedSeatIds, onToggleSeat, onBack }: ZoneSeatMapProps) {
  const rows = Array.from(new Set(seats.map((seat) => seat.row)));

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary/40 hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Đổi hạng vé
          </button>
          <p className="text-sm font-bold text-primary">Bước 2</p>
          <h2 className="text-2xl font-black tracking-tight text-foreground">Chọn ghế {zone.name}</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Chỉ hiển thị ghế thuộc khu đã chọn. Ghế được bo cong nhẹ theo khoảng cách với sân khấu.
          </p>
        </div>
        <SeatLegend />
      </div>

      <div className="mb-8 flex justify-center">
        <div className="w-full max-w-3xl">
          <div className="mx-auto mb-10 flex h-12 max-w-sm items-center justify-center rounded-full border border-white/15 bg-foreground shadow-xl shadow-foreground/10">
            <p className="text-sm font-black text-background">Sân khấu</p>
          </div>

          <div className="overflow-x-auto pb-3">
            <div className="min-w-[620px] space-y-3">
              {rows.map((row, rowIndex) => {
                const rowSeats = seats.filter((seat) => seat.row === row);
                const curveOffset = Math.abs(rowIndex - rows.length / 2) * 4;

                return (
                  <div
                    key={row}
                    className="grid items-center gap-3"
                    style={{ gridTemplateColumns: '40px 1fr 40px' }}
                  >
                    <div className="text-right text-xs font-bold text-muted-foreground">{row}</div>
                    <div
                      className="flex justify-center gap-1.5"
                      style={{ transform: `translateY(${curveOffset}px)` }}
                    >
                      {rowSeats.map((seat, seatIndex) => {
                        const isSelected = selectedSeatIds.includes(seat.id);
                        const visualStatus: SeatStatus = isSelected ? 'selected' : seat.status;
                        const middle = (rowSeats.length - 1) / 2;
                        const stagger = Math.abs(seatIndex - middle) * 0.75 + rowIndex * 0.35;
                        const addAisle = seatIndex === Math.floor(rowSeats.length / 2) - 1;

                        return (
                          <span key={seat.id} className={addAisle ? 'mr-5 inline-flex' : 'inline-flex'}>
                            <SeatButton
                              seat={seat}
                              visualStatus={visualStatus}
                              isSelected={isSelected}
                              onToggle={onToggleSeat}
                              style={{ transform: `translateY(${stagger}px)` }}
                            />
                          </span>
                        );
                      })}
                    </div>
                    <div className="text-left text-xs font-bold text-muted-foreground">{row}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-muted/45 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-black text-foreground">{zone.name}</p>
            <p className="text-sm text-muted-foreground">{zone.description}</p>
          </div>
          <p className="text-lg font-black text-primary">{Number(zone.price).toLocaleString('vi-VN')}đ / vé</p>
        </div>
      </div>
    </div>
  );
}
