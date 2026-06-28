import type { TicketZone } from '@/lib/types';

interface ZoneInfoCardProps {
  zone: TicketZone;
  isSelected?: boolean;
  onSelect: (zone: TicketZone) => void;
}

export function ZoneInfoCard({ zone, isSelected, onSelect }: ZoneInfoCardProps) {
  const isSoldOut = zone.status === 'sold-out';

  return (
    <button
      type="button"
      onClick={() => onSelect(zone)}
      disabled={isSoldOut}
      className={`w-full rounded-3xl border p-4 text-left shadow-sm transition ${
        isSelected
          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
          : 'border-border bg-card hover:-translate-y-0.5 hover:border-primary/50'
      } ${isSoldOut ? 'cursor-not-allowed opacity-55' : ''}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: zone.color }} />
            <p className="font-black text-foreground">{zone.name}</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{zone.description}</p>
        </div>
        <span className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${
          isSoldOut ? 'bg-destructive/15 text-destructive' : zone.status === 'limited' ? 'bg-[#e0a82e]/20 text-[#765514]' : 'bg-accent/10 text-accent'
        }`}>
          {isSoldOut ? 'Hết vé' : zone.status === 'limited' ? 'Sắp hết' : 'Còn vé'}
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm text-muted-foreground">Còn {zone.remaining.toLocaleString('vi-VN')} / {zone.total.toLocaleString('vi-VN')} vé</span>
        <span className="font-black text-foreground">{Number(zone.price).toLocaleString('vi-VN')}đ</span>
      </div>
    </button>
  );
}
