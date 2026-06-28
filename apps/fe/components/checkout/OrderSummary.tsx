import { ArrowRight, Ticket } from 'lucide-react';
import type { Seat, TicketZone } from '@/lib/types';

interface OrderSummaryProps {
  concertTitle: string;
  selectedZone?: TicketZone;
  selectedSeats: Seat[];
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimaryAction?: () => void;
  onChangeZone?: () => void;
  compact?: boolean;
  zones?: TicketZone[];
}

export function OrderSummary({
  concertTitle,
  selectedZone,
  selectedSeats,
  primaryLabel,
  primaryDisabled,
  onPrimaryAction,
  onChangeZone,
  compact,
  zones = [],
}: OrderSummaryProps) {
  const quantity = selectedSeats.length;

  // Tính tổng tiền chi tiết dựa trên giá từng ghế
  const subtotal = selectedSeats.reduce((sum, seat) => {
    const zone = zones.find((z) => z.id === seat.zoneId) || selectedZone;
    return sum + Number(zone?.price ?? 0);
  }, 0);

  const total = subtotal;

  // Nhóm các ghế đã chọn theo TicketZone để hiển thị
  const groupedSeats = selectedSeats.reduce((acc, seat) => {
    const zone = zones.find((z) => z.id === seat.zoneId) || selectedZone;
    const zoneId = zone?.id || 'unknown';
    const zoneName = zone?.name || 'Chưa phân loại';
    const zoneColor = zone?.color || '#cccccc';
    const zonePrice = Number(zone?.price ?? 0);

    if (!acc[zoneId]) {
      acc[zoneId] = {
        name: zoneName,
        color: zoneColor,
        price: zonePrice,
        seats: [],
      };
    }
    acc[zoneId].seats.push(seat);
    return acc;
  }, {} as Record<string, { name: string; color: string; price: number; seats: Seat[] }>);

  const groupedList = Object.values(groupedSeats);

  if (compact) {
    return (
      <div className="rounded-t-3xl border border-border bg-card p-4 shadow-2xl shadow-foreground/15">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {groupedList.length > 0 
                ? groupedList.map(g => `${g.name} (${g.seats.length} vé)`).join(', ') 
                : 'Chưa chọn khu'}
            </p>
            <p className="font-bold text-foreground text-xs">
              {selectedSeats.length > 0 
                ? `Ghế: ${selectedSeats.map((seat) => seat.label).join(', ')}` 
                : 'Chọn khu và ghế để tiếp tục'}
            </p>
          </div>
          <p className="text-lg font-bold text-primary shrink-0">{total.toLocaleString('vi-VN')}đ</p>
        </div>
        {onPrimaryAction && (
          <button
            type="button"
            disabled={primaryDisabled}
            onClick={onPrimaryAction}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-bold text-primary-foreground transition hover:bg-primary/90 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
          >
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="sticky top-24 rounded-3xl border border-border bg-card p-6 shadow-xl shadow-foreground/5">
      <div className="mb-5 flex items-center gap-2">
        <div className="rounded-2xl bg-primary/12 p-2.5 text-primary">
          <Ticket className="size-5" />
        </div>
        <h3 className="text-xl font-black text-foreground">Chi tiết đơn hàng</h3>
      </div>

      <div className="space-y-4 border-b border-border pb-5">
        <div>
          <p className="text-sm text-muted-foreground">Sự kiện</p>
          <p className="font-semibold text-foreground">{concertTitle}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-2">Thông tin vé & Hạng vé</p>
          {groupedList.length > 0 ? (
            <div className="space-y-3">
              {groupedList.map((g, idx) => (
                <div key={idx} className="rounded-2xl bg-muted/60 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: g.color }} />
                      <p className="font-bold text-foreground">{g.name}</p>
                    </div>
                    <span className="font-semibold text-muted-foreground">{g.seats.length} vé</span>
                  </div>
                  <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                    <span>Đơn giá: {g.price.toLocaleString('vi-VN')}đ</span>
                    <span>Thành tiền: {(g.price * g.seats.length).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/40 pt-2">
                    {g.seats.map((seat) => (
                      <span key={seat.id} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                        {seat.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-semibold text-muted-foreground">Chưa chọn ghế</p>
          )}
        </div>
      </div>

      <div className="space-y-3 border-b border-border py-5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Số lượng</span>
          <span className="font-semibold text-foreground">{quantity} vé</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tạm tính</span>
          <span className="font-semibold text-foreground">{subtotal.toLocaleString('vi-VN')}đ</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Phí dịch vụ</span>
          <span className="font-semibold text-foreground">Miễn phí</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">VAT</span>
          <span className="font-semibold text-foreground">Đã bao gồm</span>
        </div>
      </div>

      <div className="flex items-center justify-between py-5">
        <span className="font-bold text-foreground">Tổng cộng</span>
        <span className="text-2xl font-black text-primary">{total.toLocaleString('vi-VN')}đ</span>
      </div>

      {onPrimaryAction && (
        <button
          type="button"
          disabled={primaryDisabled}
          onClick={onPrimaryAction}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-bold text-primary-foreground transition hover:bg-primary/90 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
        >
          {primaryLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
