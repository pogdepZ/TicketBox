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
  status?: string;
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
  status = 'ACTIVE',
}: ETicketCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  const formattedDate = new Date(date).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Xác định trạng thái thực tế của vé
  const getTicketStatus = () => {
    const eventDateTime = new Date(date);
    const isExpired = eventDateTime < new Date();

    if (status === 'USED') {
      return {
        label: 'Đã sử dụng',
        classes: 'bg-slate-500/10 text-slate-500 border-slate-500/20 dark:bg-slate-500/20',
        isActive: false,
      };
    }
    if (status === 'CANCELLED') {
      return {
        label: 'Đã huỷ',
        classes: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400 dark:bg-rose-950/30',
        isActive: false,
      };
    }
    if (status === 'REFUNDED') {
      return {
        label: 'Đã hoàn tiền',
        classes: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400 dark:bg-blue-950/30',
        isActive: false,
      };
    }
    if (isExpired) {
      return {
        label: 'Đã hết hạn',
        classes: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:bg-amber-950/30',
        isActive: false,
      };
    }

    return {
      label: 'Chưa sử dụng',
      classes: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-950/30',
      isActive: true,
    };
  };

  const ticketStatusInfo = getTicketStatus();

  function handleDownload() {
    if (!downloadRef.current) return;

    toPng(downloadRef.current, {
      backgroundColor: 'rgb(3, 7, 18)', // slate-950
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
    <div ref={cardRef} className="mx-auto max-w-md w-full overflow-hidden rounded-[2.5rem] border border-border bg-card text-foreground shadow-xl relative">
      {/* Subtle glow matching the site's accent */}
      {ticketStatusInfo.isActive && (
        <>
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        </>
      )}

      {/* Ticket Body: Info Section */}
      <div className="p-6 pb-4 relative z-10">
        <div className="flex justify-between items-center mb-5">
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            <span className={`w-1.5 h-1.5 rounded-full ${ticketStatusInfo.isActive ? 'bg-primary animate-pulse' : 'bg-slate-400'}`} />
            TicketBox E-Pass
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${ticketStatusInfo.classes}`}>
            {ticketStatusInfo.label}
          </span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black tracking-tight text-foreground mb-5 line-clamp-2 leading-tight">
          {concertTitle}
        </h3>

        {/* Details Layout */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 bg-muted/40 p-4 rounded-2xl border border-border/50">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Ngày diễn</p>
            <p className="text-xs sm:text-sm font-bold text-foreground">{formattedDate}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Giờ diễn</p>
            <p className="text-xs sm:text-sm font-bold text-foreground">{time}</p>
          </div>
          <div className="col-span-2 border-t border-border/50 pt-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Địa điểm</p>
            <p className="text-xs font-semibold text-muted-foreground line-clamp-2 leading-relaxed">{venue}</p>
          </div>
        </div>

        {/* Seat specifics & pricing */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-muted/20 p-2.5 rounded-xl border border-border/50 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Khu vực</p>
            <p className="text-xs sm:text-sm font-black text-primary truncate" title={seatZone}>{seatZone}</p>
          </div>
          <div className="bg-muted/20 p-2.5 rounded-xl border border-border/50 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Ghế</p>
            <p className="text-xs sm:text-sm font-black text-primary truncate" title={seatNumber}>{seatNumber}</p>
          </div>
          <div className="bg-muted/20 p-2.5 rounded-xl border border-border/50 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Giá vé</p>
            <p className="text-xs sm:text-sm font-black text-primary truncate">{price.toLocaleString('vi-VN')}đ</p>
          </div>
        </div>
      </div>

      {/* Ticket Cut Separator */}
      <div className="relative my-2">
        <div className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-3 h-6 rounded-r-full bg-background border-y border-r border-border z-20" />
        <div className="absolute -right-[1px] top-1/2 -translate-y-1/2 w-3 h-6 rounded-l-full bg-background border-y border-l border-border z-20" />
        <div className="border-t border-dashed border-border w-full" />
      </div>

      {/* Ticket Stub: QR Centerpiece */}
      <div className="p-6 pt-4 text-center relative z-10">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] block mb-4">
          QUÉT MÃ ĐỂ VÀO CỬA SOÁT VÉ
        </span>

        {/* Large Focal QR Code */}
        <div className="mb-6 flex justify-center">
          <div className="h-48 w-48 sm:h-56 sm:w-56 rounded-[2rem] bg-white p-4.5 shadow-xl shadow-foreground/5 transition-transform duration-300 hover:scale-[1.02] flex items-center justify-center overflow-hidden border border-border/50 relative">
            <div className={`w-full h-full flex items-center justify-center transition-opacity duration-300 ${!ticketStatusInfo.isActive ? 'opacity-15 grayscale blur-[0.5px]' : ''}`}>
              {qrPayload ? (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrPayload)}`}
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

            {/* Overlaid status text over QR if not active */}
            {!ticketStatusInfo.isActive && (
              <div className="absolute inset-0 flex items-center justify-center p-4 bg-white/40 backdrop-blur-[1px]">
                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${ticketStatusInfo.classes} bg-white dark:bg-slate-900 shadow-md border`}>
                  {ticketStatusInfo.label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Mono Ticket Number & Purchase Date */}
        <div className="mb-6">
          <p className="font-mono text-sm sm:text-base font-bold text-primary tracking-[0.2em] uppercase break-all">
            {ticketNumber}
          </p>
          <p className="text-[9px] text-muted-foreground mt-1 uppercase tracking-wider">
            Ngày mua: {purchaseDate}
          </p>
        </div>

        {/* Call to Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 font-bold text-primary-foreground transition hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-px cursor-pointer shadow-lg shadow-primary/10"
          >
            <Download className="w-4 h-4" />
            Tải xuống
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary hover:-translate-y-0.5 active:translate-y-px cursor-pointer"
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
          className="w-[400px] bg-slate-950 p-8 flex flex-col items-center text-center rounded-[2.5rem] border-2 border-primary/30 relative"
        >
          {/* Header */}
          <div className="w-full flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              TicketBox E-Pass
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${ticketStatusInfo.classes.replace('dark:', '')}`}>
              {ticketStatusInfo.label}
            </span>
          </div>

          <h2 className="mt-4 text-xl font-black text-white leading-tight line-clamp-2">
            {concertTitle}
          </h2>
          <p className="mt-1.5 text-xs text-slate-400">{formattedDate} · {time}</p>

          {/* Main Focus: Massive QR Code */}
          <div className="my-6 p-5 bg-white rounded-3xl shadow-2xl flex flex-col items-center justify-center relative">
            <div className={`w-60 h-60 flex items-center justify-center overflow-hidden ${!ticketStatusInfo.isActive ? 'opacity-15 grayscale blur-[0.5px]' : ''}`}>
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
            {!ticketStatusInfo.isActive && (
              <div className="absolute inset-0 flex items-center justify-center p-4 bg-white/40 backdrop-blur-[1px]">
                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${ticketStatusInfo.classes.replace('dark:', '')} bg-white shadow-md border`}>
                  {ticketStatusInfo.label}
                </span>
              </div>
            )}
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
