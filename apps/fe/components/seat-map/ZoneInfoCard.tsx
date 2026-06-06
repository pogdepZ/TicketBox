import type { TicketZone } from '@/lib/mock-data';

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
      className={`w-full rounded-lg border p-4 text-left transition ${
        isSelected
          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
          : 'border-border bg-card hover:border-primary/70 hover:bg-muted/40'
      } ${isSoldOut ? 'cursor-not-allowed opacity-55' : ''}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: zone.color }} />
            <p className="font-bold text-foreground">{zone.name} / {zone.label}</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{zone.description}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
          isSoldOut ? 'bg-destructive/15 text-destructive' : zone.status === 'limited' ? 'bg-accent/15 text-accent' : 'bg-primary/15 text-primary'
        }`}>
          {isSoldOut ? 'Hết vé' : zone.status === 'limited' ? 'Sắp hết' : 'Còn vé'}
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm text-muted-foreground">Còn {zone.remaining.toLocaleString('vi-VN')} / {zone.total.toLocaleString('vi-VN')} vé</span>
        <span className="font-bold text-primary">{zone.price.toLocaleString('vi-VN')}đ</span>
      </div>
    </button>
  );
}
