import type { SeatStatus } from '@/lib/types';

const legendItems: Array<{ label: string; status: SeatStatus; className: string }> = [
  { label: 'Còn trống', status: 'available', className: 'border-accent/25 bg-card' },
  { label: 'Đã chọn', status: 'selected', className: 'border-primary bg-primary' },
  { label: 'Đã bán', status: 'sold', className: 'border-muted bg-muted opacity-50' },
  { label: 'Đang giữ', status: 'held', className: 'border-accent/30 bg-accent/15' },
];

export function SeatLegend() {
  return (
    <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-muted/40 p-3">
      {legendItems.map((item) => (
        <div key={item.status} className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`h-4 w-4 rounded border ${item.className}`} />
          {item.label}
        </div>
      ))}
    </div>
  );
}
