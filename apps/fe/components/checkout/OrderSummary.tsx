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
  const fee = 0;
  const tax = 0;
  const total = subtotal;

  if (compact) {
    return (
      <div className="rounded-t-3xl border border-border bg-card p-4 shadow-2xl shadow-foreground/15">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{selectedZone ? selectedZone.name : 'Chưa chọn khu'}</p>
            <p className="font-bold text-foreground">
              {selectedSeats.length > 0 ? `${selectedSeats.length} ghế: ${selectedSeats.map((seat) => seat.label).join(', ')}` : 'Chọn khu và ghế để tiếp tục'}
            </p>
          </div>
          <p className="text-lg font-bold text-primary">{total.toLocaleString('vi-VN')}đ</p>
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
          <p className="text-sm text-muted-foreground">Hạng vé</p>
          {selectedZone ? (
            <div className="mt-1 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedZone.color }} />
                <p className="font-semibold text-foreground">{selectedZone.name}</p>
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
          <div className="rounded-2xl bg-muted/60 p-3 text-sm text-muted-foreground">
            <div className="flex justify-between gap-3">
              <span>Giá vé</span>
              <span className="font-semibold text-foreground">{selectedZone.price.toLocaleString('vi-VN')}đ</span>
            </div>
            {selectedZone.remaining > 0 && (
              <div className="mt-1 flex justify-between gap-3">
                <span>Còn lại</span>
                <span className="font-semibold text-foreground">{selectedZone.remaining.toLocaleString('vi-VN')} vé</span>
              </div>
            )}
          </div>
        )}

        <div>
          <p className="text-sm text-muted-foreground">Ghế đã chọn</p>
          {selectedSeats.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedSeats.map((seat) => (
                <span key={seat.id} className="rounded-full bg-primary/12 px-3 py-1 text-sm font-bold text-primary">
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
