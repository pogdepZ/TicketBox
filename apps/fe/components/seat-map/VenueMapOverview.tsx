import type { TicketZone } from '@/lib/types';
import { ZoneInfoCard } from './ZoneInfoCard';

interface VenueMapOverviewProps {
  zones: TicketZone[];
  selectedZone?: TicketZone;
  onSelectZone: (zone: TicketZone) => void;
}

const zonePaths: Record<string, string> = {
  svip: 'M300 148 Q380 112 460 148 L438 220 Q380 200 322 220 Z',
  vip: 'M152 212 Q250 140 328 240 Q380 276 432 240 Q510 140 608 212 L568 294 Q482 350 380 330 Q278 350 192 294 Z',
  premium: 'M126 294 Q252 370 380 370 Q508 370 634 294 L676 356 Q532 448 380 448 Q228 448 84 356 Z',
  standard: 'M66 378 Q222 482 380 482 Q538 482 694 378 L722 436 Q554 548 380 548 Q206 548 38 436 Z',
  economy: 'M24 460 Q198 584 380 584 Q562 584 736 460 L752 522 Q570 652 380 652 Q190 652 8 522 Z',
};

const zoneLabelPositions: Record<string, { x: number; y: number; priceY: number }> = {
  svip: { x: 380, y: 176, priceY: 200 },
  vip: { x: 380, y: 268, priceY: 292 },
  premium: { x: 380, y: 388, priceY: 412 },
  standard: { x: 380, y: 500, priceY: 524 },
  economy: { x: 380, y: 590, priceY: 614 },
};

export function VenueMapOverview({ zones, selectedZone, onSelectZone }: VenueMapOverviewProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-8">
        <div className="mb-6">
          <p className="text-sm font-bold text-primary">Bước 1</p>
          <h2 className="text-2xl font-black tracking-tight text-foreground">Chọn hạng vé theo sơ đồ sân khấu</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Xem vị trí từng khu trước khi chuyển sang chọn ghế chi tiết. Bản đồ này chỉ dùng để chọn hạng vé.
          </p>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-border bg-[radial-gradient(circle_at_top,#263636_0%,#111817_38%,#0b0f0e_100%)] p-3 shadow-inner">
          <svg viewBox="0 70 760 590" className="h-auto w-full" role="img" aria-label="Sơ đồ khu vé sân khấu">
            <defs>
              <filter id="venueGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="selectedZoneGlow" x="-25%" y="-25%" width="150%" height="150%">
                <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ffffff" floodOpacity="0.55" />
                <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#e5484d" floodOpacity="0.38" />
              </filter>
              <linearGradient id="stageGradient" x1="0" x2="1">
                <stop offset="0%" stopColor="#e5484d" />
                <stop offset="52%" stopColor="#e0a82e" />
                <stop offset="100%" stopColor="#3d6f8f" />
              </linearGradient>
            </defs>

            <rect x="260" y="82" width="240" height="44" rx="22" fill="url(#stageGradient)" filter="url(#venueGlow)" />
            <text x="380" y="110" textAnchor="middle" className="fill-white text-sm font-bold">SÂN KHẤU</text>
            <path d="M248 132 Q380 166 512 132" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="2" strokeDasharray="8 8" />

            {zones.map((zone) => {
              const isSelected = selectedZone?.id === zone.id;
              const isSoldOut = zone.status === 'sold-out';
              const visualCode = (zone.code || zone.id || 'economy').toLowerCase();
              const labelPosition = zoneLabelPositions[visualCode] || zoneLabelPositions.economy;
              const pathD = zonePaths[visualCode] || zonePaths.economy;

              return (
                <g
                  key={zone.id}
                  aria-label={zone.name}
                  onClick={() => !isSoldOut && onSelectZone(zone)}
                  className={isSoldOut ? 'cursor-not-allowed opacity-45 outline-none' : 'cursor-pointer outline-none'}
                >
                  <title>{zone.name}</title>
                  <path
                    d={pathD}
                    fill={zone.color}
                    fillOpacity={isSelected ? 0.58 : 0.24}
                    stroke={zone.color}
                    strokeOpacity={isSelected ? 1 : 0.75}
                    strokeWidth={isSelected ? 4 : 2}
                    filter={isSelected ? 'url(#selectedZoneGlow)' : undefined}
                    className="transition-all"
                  />
                  {labelPosition && (
                    <>
                      <text
                        x={labelPosition.x}
                        y={labelPosition.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        pointerEvents="none"
                        className="fill-white text-base font-bold"
                      >
                        {zone.name}
                      </text>
                      <text
                        x={labelPosition.x}
                        y={labelPosition.priceY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        pointerEvents="none"
                        className="fill-white/80 text-xs"
                      >
                        {Number(zone.price).toLocaleString('vi-VN')}đ · {isSoldOut ? 'Hết vé' : `Còn ${zone.remaining}`}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {zones.map((zone) => (
          <ZoneInfoCard
            key={zone.id}
            zone={zone}
            isSelected={selectedZone?.id === zone.id}
            onSelect={onSelectZone}
          />
        ))}
      </div>
    </div>
  );
}
