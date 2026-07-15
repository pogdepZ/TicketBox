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
      backgroundColor: 'rgb(3, 7, 18)', // slate-950 background of the image canvas
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
    <div ref={cardRef} className="relative w-full max-w-sm bg-card border border-border rounded-3xl shadow-xl overflow-hidden flex flex-col font-sans transition-all duration-300 hover:shadow-primary/5 hover:border-primary/30 group">
      {/* Top Section: QR Code Focus */}
      <div className="p-6 flex flex-col items-center justify-center bg-muted/20">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-6">
          TicketBox E-Pass
        </div>

        {/* Massive QR Container */}
        <div className="relative p-5 bg-card rounded-3xl shadow-lg border border-border/80 flex items-center justify-center overflow-hidden mb-4 group-hover:border-primary/40 transition-all duration-300">
          {/* Scan Frame Corners */}
          <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-primary rounded-tl-md" />
          <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-primary rounded-tr-md" />
          <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-primary rounded-bl-md" />
          <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-primary rounded-br-md" />
          
          <div className="w-40 h-40 flex items-center justify-center overflow-hidden bg-white p-2.5 rounded-2xl">
            {qrPayload ? (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrPayload)}`}
                alt="QR Code"
                className="w-full h-full object-contain"
                loading="lazy"
                crossOrigin="anonymous"
              />
            ) : (
              <svg viewBox="0 0 100 100" className="w-full h-full text-foreground">
                <rect width="100" height="100" fill="white" />
                <path d="M8 8h24v24H8zM14 14v12h12V14zM68 8h24v24H68zM74 14v12h12V14zM8 68h24v24H8zM14 74v12h12V74zM44 10h8v8h-8zM56 18h8v8h-8zM40 32h24v8H40zM72 44h8v8h-8zM84 52h8v8h-8zM40 52h8v8h-8zM52 60h16v8H52zM72 72h20v8H72zM40 78h8v14h-8zM56 84h8v8h-8z" fill="currentColor" />
              </svg>
            )}
          </div>
        </div>

        <p className="font-mono text-[11px] font-bold text-muted-foreground tracking-widest uppercase">
          {ticketNumber}
        </p>
      </div>

      {/* Separator / Tear Line with Notches */}
      <div className="relative w-full my-1">
        {/* Left Notch */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3.5 w-7 h-7 rounded-full bg-background border-r border-border z-10" />
        {/* Right Notch */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3.5 w-7 h-7 rounded-full bg-background border-l border-border z-10" />
        {/* Dashed Line */}
        <div className="w-full border-t border-dashed border-border" />
      </div>

      {/* Bottom Section: Detailed Info */}
      <div className="p-6 flex flex-col gap-4">
        <h3 className="text-xl font-black tracking-tight text-foreground leading-tight text-center">
          {concertTitle}
        </h3>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 bg-muted/40 p-4 rounded-2xl border border-border/60 text-left">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5 font-bold">Thời gian</p>
            <p className="text-xs font-bold text-foreground">{time} · {formattedDate}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5 font-bold">Khu vực / Ghế</p>
            <p className="text-xs font-black text-primary">{seatZone} · Ghế {seatNumber}</p>
          </div>
          <div className="col-span-2 border-t border-border/40 pt-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5 font-bold">Địa điểm</p>
            <p className="text-xs font-semibold text-foreground line-clamp-1">{venue}</p>
          </div>
          <div className="col-span-2 border-t border-border/40 pt-2.5 flex justify-between items-center">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5 font-bold">Giá vé</p>
              <p className="text-sm font-black text-primary">{price.toLocaleString('vi-VN')}đ</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5 font-bold">Ngày mua</p>
              <p className="text-xs font-bold text-foreground">{purchaseDate}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-2">
          <button
            onClick={handleDownload}
            className="flex-1 flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2 font-bold text-primary-foreground transition hover:bg-primary/95 active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Tải xuống
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 font-bold text-foreground transition hover:border-primary/40 hover:text-primary active:scale-[0.98] cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            Chia sẻ
          </button>
        </div>
      </div>

      {/* Hidden container used ONLY for generating the PNG image */}
      {/* High-contrast System Light (White & Orange-Red) theme for the downloadable ticket */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
        <div className="light font-sans">
          <div
            ref={downloadRef}
            className="w-[400px] bg-background p-6 flex flex-col items-center rounded-[2.5rem] border-2 border-border text-foreground"
          >
            {/* Header */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-6">
              TicketBox E-Pass
            </div>

            {/* QR Code Container */}
            <div className="relative p-6 bg-card rounded-3xl shadow-sm border border-border flex items-center justify-center overflow-hidden mb-4">
              {/* Scan Frame Corners */}
              <div className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl-md" />
              <div className="absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr-md" />
              <div className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl-md" />
              <div className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br-md" />
              
              <div className="w-52 h-52 flex items-center justify-center overflow-hidden bg-white p-3 rounded-2xl shadow-inner">
                {qrPayload ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload)}`}
                    alt="QR Code"
                    className="w-full h-full object-contain"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
                    <rect width="100" height="100" fill="white" />
                    <path d="M8 8h24v24H8zM14 14v12h12V14zM68 8h24v24H68zM74 14v12h12V14zM8 68h24v24H8zM14 74v12h12V74zM44 10h8v8h-8zM56 18h8v8h-8zM40 32h24v8H40zM72 44h8v8h-8zM84 52h8v8h-8zM40 52h8v8h-8zM52 60h16v8H52zM72 72h20v8H72zM40 78h8v14h-8zM56 84h8v8h-8z" fill="currentColor" />
                  </svg>
                )}
              </div>
            </div>

            <p className="font-mono text-xs font-bold text-muted-foreground tracking-widest mb-6">
              {ticketNumber}
            </p>

            {/* Separator / Tear Line */}
            <div className="relative w-full my-4">
              {/* Left Notch (matches canvas background) */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-8 h-8 rounded-full bg-slate-950 border-r border-border z-10" />
              {/* Right Notch (matches canvas background) */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-8 h-8 rounded-full bg-slate-950 border-l border-border z-10" />
              {/* Dashed line */}
              <div className="w-full border-t border-dashed border-border" />
            </div>

            {/* Concert Title */}
            <h3 className="text-xl font-black text-foreground leading-tight text-center mb-4">
              {concertTitle}
            </h3>

            {/* Ticket Info Grid */}
            <div className="w-full grid grid-cols-2 gap-x-4 gap-y-3.5 bg-muted/40 p-5 rounded-[1.5rem] border border-border text-left">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5 font-bold">Thời gian</p>
                <p className="text-xs font-bold text-foreground">{time} · {formattedDate}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5 font-bold">Khu vực / Ghế</p>
                <p className="text-xs font-black text-primary">{seatZone} · Ghế {seatNumber}</p>
              </div>
              <div className="col-span-2 border-t border-border/40 pt-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5 font-bold">Địa điểm</p>
                <p className="text-xs font-semibold text-foreground line-clamp-1">{venue}</p>
              </div>
              <div className="col-span-2 border-t border-border/40 pt-2.5 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5 font-bold">Giá vé</p>
                  <p className="text-xs font-extrabold text-primary">{price.toLocaleString('vi-VN')}đ</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5 font-bold">Ngày mua</p>
                  <p className="text-xs font-bold text-foreground">{purchaseDate}</p>
                </div>
              </div>
            </div>

            {/* Footer message */}
            <p className="mt-6 text-[9px] font-bold text-muted-foreground tracking-wider">
              VUI LÒNG XUẤT TRÌNH VÉ NÀY TẠI CỬA BÀN SOÁT VÉ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
