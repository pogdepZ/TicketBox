import { Download, Share2 } from 'lucide-react';

interface ETicketCardProps {
  ticketNumber: string;
  concertTitle: string;
  date: string;
  time: string;
  venue: string;
  seatZone: string;
  seatNumber: string;
  price: number;
  purchaseDate: string;
}

export function ETicketCard({
  ticketNumber,
  concertTitle,
  date,
  time,
  venue,
  seatZone,
  seatNumber,
  price,
  purchaseDate,
}: ETicketCardProps) {
  const formattedDate = new Date(date).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-gradient-to-r from-primary/10 to-accent/10 border-2 border-dashed border-primary rounded-lg overflow-hidden">
      <div className="bg-card border-b border-primary/20 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Mã vé</p>
            <p className="font-mono font-bold text-primary">{ticketNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">Ngày mua</p>
            <p className="text-sm font-semibold text-foreground">{purchaseDate}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-2xl font-bold text-foreground mb-4">{concertTitle}</h3>

        <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-primary/20">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Ngày</p>
            <p className="font-semibold text-foreground">{formattedDate}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Giờ</p>
            <p className="font-semibold text-foreground">{time}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground mb-1">Địa điểm</p>
            <p className="font-semibold text-foreground">{venue}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-primary/20">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Khu vực</p>
            <p className="font-bold text-lg text-primary">{seatZone}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Ghế</p>
            <p className="font-bold text-lg text-primary">{seatNumber}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Giá</p>
            <p className="font-bold text-lg text-primary">{price.toLocaleString('vi-VN')}đ</p>
          </div>
        </div>

        <div className="flex items-center justify-center mb-6 p-4 bg-white/5 rounded-lg">
          <div className="w-32 h-32 bg-white p-2 rounded">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <rect width="100" height="100" fill="white" />
              <path d="M8 8h24v24H8zM14 14v12h12V14zM68 8h24v24H68zM74 14v12h12V14zM8 68h24v24H8zM14 74v12h12V74zM44 10h8v8h-8zM56 18h8v8h-8zM40 32h24v8H40zM72 44h8v8h-8zM84 52h8v8h-8zM40 52h8v8h-8zM52 60h16v8H52zM72 72h20v8H72zM40 78h8v14h-8zM56 84h8v8h-8z" fill="black" />
            </svg>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium">
            <Download className="w-4 h-4" />
            Tải xuống
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-primary text-primary rounded-lg hover:bg-primary/10 transition font-medium">
            <Share2 className="w-4 h-4" />
            Chia sẻ
          </button>
        </div>
      </div>
    </div>
  );
}
