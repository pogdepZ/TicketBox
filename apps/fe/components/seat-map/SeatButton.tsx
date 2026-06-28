import type { Seat, SeatStatus } from '@/lib/types';

interface SeatButtonProps {
  seat: Seat;
  visualStatus: SeatStatus;
  isSelected: boolean;
  style?: React.CSSProperties;
  onToggle: (seat: Seat) => void;
}

const statusClass: Record<SeatStatus, string> = {
  available: 'border-accent/25 bg-card text-foreground hover:border-primary hover:bg-primary/12',
  selected: 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20',
  sold: 'cursor-not-allowed border-muted bg-muted text-muted-foreground opacity-40',
  held: 'cursor-not-allowed border-accent/30 bg-accent/15 text-accent opacity-70',
  disabled: 'cursor-not-allowed border-border bg-background text-muted-foreground opacity-20',
};

export function SeatButton({ seat, visualStatus, isSelected, style, onToggle }: SeatButtonProps) {
  const isInteractive = seat.status === 'available';

  return (
    <button
      type="button"
      disabled={!isInteractive}
      onClick={() => onToggle(seat)}
      style={style}
      aria-pressed={isSelected}
      aria-label={`${seat.label} - ${visualStatus}`}
      title={`${seat.label} - ${visualStatus}`}
      className={`h-7 w-7 rounded-lg border text-[10px] font-bold transition active:translate-y-px ${statusClass[visualStatus]}`}
    >
      {seat.number}
    </button>
  );
}
