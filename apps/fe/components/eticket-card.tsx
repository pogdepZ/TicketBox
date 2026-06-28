"use client";

import { useRef } from 'react';
import { Download, Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';

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
  const cardRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  const formattedDate = new Date(date).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  function handleDownload() {
    if (!downloadRef.current) return;

    toPng(downloadRef.current, {
      backgroundColor: 'rgb(3, 7, 18)', // Khớp nền tối slate-950 của dự án
      style: {
        borderRadius: '2.5rem',
      },
      cacheBust: true,
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `ticket-${ticketNumber}.png`;
        link.href = dataUrl;
        link.click();

        window.dispatchEvent(
          new CustomEvent('ticketbox-toast', {
            detail: {
              title: 'Tải xuống thành công',
              message: `Đã tải xuống vé điện tử ${ticketNumber} dưới dạng hình ảnh PNG.`,
              type: 'success',
            },
          })
        );
      })
      .catch((err) => {
        console.error('Error generating image:', err);
        window.dispatchEvent(
          new CustomEvent('ticketbox-toast', {
            detail: {
              title: 'Tải xuống thất bại',
              message: 'Có lỗi xảy ra khi tạo file ảnh vé.',
              type: 'error',
            },
          })
        );
      });
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
    <div ref={cardRef} className="overflow-hidden rounded-[2rem] border border-dashed border-primary/55 bg-card shadow-xl shadow-foreground/5 max-w-full">
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
                crossOrigin="anonymous"
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

      {/* Hidden container used ONLY for generating the PNG image */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
        <div
          ref={downloadRef}
          className="w-[400px] bg-slate-950 p-8 flex flex-col items-center text-center rounded-[2.5rem] border-2 border-primary/30"
        >
          {/* Header */}
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            TicketBox E-Pass
          </span>
          <h2 className="mt-4 text-xl font-black text-white leading-tight line-clamp-2">
            {concertTitle}
          </h2>
          <p className="mt-1.5 text-xs text-slate-400">{formattedDate} · {time}</p>

          {/* Main Focus: Massive QR Code */}
          <div className="my-6 p-5 bg-white rounded-3xl shadow-2xl flex flex-col items-center justify-center">
            <div className="w-60 h-60 flex items-center justify-center overflow-hidden">
              {qrPayload ? (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrPayload)}`}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                  crossOrigin="anonymous"
                />
              ) : (
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <rect width="100" height="100" fill="white" />
                  <path d="M8 8h24v24H8zM14 14v12h12V14zM68 8h24v24H68zM74 14v12h12V14zM8 68h24v24H8zM14 74v12h12V74zM44 10h8v8h-8zM56 18h8v8h-8zM40 32h24v8H40zM72 44h8v8h-8zM84 52h8v8h-8zM40 52h8v8h-8zM52 60h16v8H52zM72 72h20v8H72zM40 78h8v14h-8zM56 84h8v8h-8z" fill="black" />
                </svg>
              )}
            </div>
          </div>

          {/* Ticket Info */}
          <div className="w-full border-t border-dashed border-white/20 pt-4 mt-2">
            <p className="font-mono text-sm font-bold text-primary tracking-widest uppercase mb-4">
              {ticketNumber}
            </p>
            
            <div className="grid grid-cols-2 gap-4 text-left bg-slate-900/60 p-4 rounded-2xl border border-white/5">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Khu vực</p>
                <p className="text-base font-black text-primary truncate" title={seatZone}>{seatZone}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Ghế</p>
                <p className="text-base font-black text-white">{seatNumber}</p>
              </div>
              <div className="col-span-2 border-t border-white/5 pt-2 mt-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Địa điểm</p>
                <p className="text-xs font-semibold text-slate-300 line-clamp-1">{venue}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-[9px] font-bold text-slate-500 tracking-wider">
            VUI LÒNG XUẤT TRÌNH VÉ NÀY TẠI CỬA BÀN SOÁT VÉ
          </div>
        </div>
      </div>
    </div>
  );
}
