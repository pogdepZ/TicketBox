"use client";

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
  qrPayload?: string;
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
  qrPayload,
}: ETicketCardProps) {
  const formattedDate = new Date(date).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  function handleDownload() {
    const ticketText = `
========================================
             TICKETBOX E-TICKET
========================================
Mã vé: ${ticketNumber}
Sự kiện: ${concertTitle}
Khu vực: ${seatZone}
Số ghế: ${seatNumber}
Giá vé: ${price.toLocaleString('vi-VN')}đ
Ngày diễn: ${formattedDate}
Thời gian: ${time}
Địa điểm: ${venue}
Ngày mua: ${purchaseDate}
========================================
Vui lòng xuất trình mã QR này tại quầy soát vé.
Cảm ơn bạn đã lựa chọn TicketBox!
    `.trim();

    const blob = new Blob([ticketText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ticket-${ticketNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    window.dispatchEvent(
      new CustomEvent('ticketbox-toast', {
        detail: {
          title: 'Tải xuống thành công',
          message: `Đã tải xuống thông tin vé điện tử ${ticketNumber}.`,
          type: 'success',
        },
      })
    );
  }

  function handleShare() {
    const shareData = {
      title: `Vé điện tử TicketBox - ${concertTitle}`,
      text: `Tôi vừa mua vé xem ${concertTitle} ghế ${seatNumber} khu vực ${seatZone}!`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      navigator.share(shareData)
        .then(() => {
          window.dispatchEvent(
            new CustomEvent('ticketbox-toast', {
              detail: {
                title: 'Chia sẻ thành công',
                message: 'Thông tin vé đã được chia sẻ.',
                type: 'success',
              },
            })
          );
        })
        .catch((err) => {
          console.error('Error sharing:', err);
        });
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          window.dispatchEvent(
            new CustomEvent('ticketbox-toast', {
              detail: {
                title: 'Đã sao chép liên kết',
                message: 'Liên kết xem vé đã được sao chép vào clipboard.',
                type: 'success',
              },
            })
          );
        })
        .catch((err) => {
          console.error('Error copying text:', err);
        });
    }
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-dashed border-primary/55 bg-card shadow-xl shadow-foreground/5 max-w-full">
      <div className="border-b border-dashed border-primary/30 bg-foreground p-6 text-background">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0 mb-2">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-background/50">Mã vé</p>
            <p className="font-mono font-bold text-primary break-all">{ticketNumber}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-background/50">Ngày mua</p>
            <p className="text-sm font-semibold text-background">{purchaseDate}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <h3 className="mb-4 text-xl sm:text-2xl font-black tracking-tight text-foreground">{concertTitle}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 pb-6 border-b border-primary/20">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Ngày</p>
            <p className="font-semibold text-foreground text-sm sm:text-base">{formattedDate}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Giờ</p>
            <p className="font-semibold text-foreground text-sm sm:text-base">{time}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground mb-1">Địa điểm</p>
            <p className="font-semibold text-foreground text-sm sm:text-base">{venue}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 min-[425px]:grid-cols-3 gap-4 mb-6 pb-6 border-b border-primary/20">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Khu vực</p>
            <p className="text-base sm:text-lg font-black text-primary truncate" title={seatZone}>{seatZone}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Ghế</p>
            <p className="text-base sm:text-lg font-black text-primary">{seatNumber}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Giá</p>
            <p className="text-base sm:text-lg font-black text-primary">{price.toLocaleString('vi-VN')}đ</p>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-center rounded-3xl bg-muted/60 p-4">
          <div className="h-32 w-32 rounded-2xl bg-white p-2 shadow-inner flex items-center justify-center overflow-hidden">
            {qrPayload ? (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload)}`}
                alt="QR Code"
                className="w-full h-full object-contain"
                loading="lazy"
              />
            ) : (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" fill="white" />
                <path d="M8 8h24v24H8zM14 14v12h12V14zM68 8h24v24H68zM74 14v12h12V14zM8 68h24v24H8zM14 74v12h12V74zM44 10h8v8h-8zM56 18h8v8h-8zM40 32h24v8H40zM72 44h8v8h-8zM84 52h8v8h-8zM40 52h8v8h-8zM52 60h16v8H52zM72 72h20v8H72zM40 78h8v14h-8zM56 84h8v8h-8z" fill="black" />
              </svg>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 font-bold text-primary-foreground transition hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-px cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Tải xuống
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 font-bold text-foreground transition hover:border-primary/40 hover:text-primary hover:-translate-y-0.5 active:translate-y-px cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            Chia sẻ
          </button>
        </div>
      </div>
    </div>
  );
}
