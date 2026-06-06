import { ArrowRight, Ticket } from 'lucide-react';
import type { Seat, TicketZone } from '@/lib/mock-data';

interface OrderSummaryProps {
  concertTitle: string;
  selectedZone?: TicketZone;
  selectedSeats: Seat[];
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimaryAction?: () => void;
  onChangeZone?: () => void;
  compact?: boolean;
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
}: OrderSummaryProps) {
  const quantity = selectedSeats.length;
  const unitPrice = selectedZone?.price ?? 0;
  const subtotal = quantity * unitPrice;
  const fee = Math.round(subtotal * 0.05);
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + fee + tax;

  if (compact) {
    return (
      <div className="rounded-t-lg border border-border bg-card p-4 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{selectedZone ? `${selectedZone.name} / ${selectedZone.label}` : 'Chưa chọn khu'}</p>
            <p className="font-bold text-foreground">
              {selectedSeats.length > 0 ? `${selectedSeats.length} ghế: ${selectedSeats.map((seat) => seat.label).join(', ')}` : 'Chọn khu và ghế để tiếp tục'}
            </p>
          </div>
          <p className="text-lg font-bold text-primary">{total.toLocaleString('vi-VN')}đ</p>
        </div>
        <button
          type="button"
          disabled={primaryDisabled}
          onClick={onPrimaryAction}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {primaryLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="sticky top-6 rounded-lg border border-border bg-card p-6">
      <div className="mb-5 flex items-center gap-2">
        <div className="rounded-lg bg-primary/15 p-2 text-primary">
          <Ticket className="h-5 w-5" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Chi tiết đơn hàng</h3>
      </div>

      <div className="space-y-4 border-b border-border pb-5">
        <div>
          <p className="text-sm text-muted-foreground">Sự kiện</p>
          <p className="font-semibold text-foreground">{concertTitle}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Hạng vé</p>
          {selectedZone ? (
            <div className="mt-1 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedZone.color }} />
                <p className="font-semibold text-foreground">{selectedZone.name} / {selectedZone.label}</p>
              </div>
              {onChangeZone && (
                <button type="button" onClick={onChangeZone} className="text-xs font-semibold text-primary hover:text-primary/80">
                  Đổi
                </button>
              )}
            </div>
          ) : (
            <p className="font-semibold text-muted-foreground">Chưa chọn khu</p>
          )}
        </div>

        {selectedZone && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <div className="mb-1 flex justify-between gap-3">
              <span>Giá vé</span>
              <span className="font-semibold text-foreground">{selectedZone.price.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Còn lại</span>
              <span className="font-semibold text-foreground">{selectedZone.remaining.toLocaleString('vi-VN')} vé</span>
            </div>
          </div>
        )}

        <div>
          <p className="text-sm text-muted-foreground">Ghế đã chọn</p>
          {selectedSeats.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedSeats.map((seat) => (
                <span key={seat.id} className="rounded bg-primary/20 px-2 py-1 text-sm font-semibold text-primary">
                  {seat.label}
                </span>
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
          <span className="font-semibold text-foreground">{fee.toLocaleString('vi-VN')}đ</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">VAT</span>
          <span className="font-semibold text-foreground">{tax.toLocaleString('vi-VN')}đ</span>
        </div>
      </div>

      <div className="flex items-center justify-between py-5">
        <span className="font-bold text-foreground">Tổng cộng</span>
        <span className="text-2xl font-bold text-primary">{total.toLocaleString('vi-VN')}đ</span>
      </div>

      <button
        type="button"
        disabled={primaryDisabled}
        onClick={onPrimaryAction}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {primaryLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
