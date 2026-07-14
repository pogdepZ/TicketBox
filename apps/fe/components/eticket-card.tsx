"use client";

import { useRef, useState } from 'react';
import { Download, Share2, Ticket, Smartphone, FileText } from 'lucide-react';
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
  const [ticketStyle, setTicketStyle] = useState<'stub' | 'wallet' | 'pdf'>('stub');

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
    <div className="space-y-6 max-w-full">
      {/* Design Style Selector Toolbar */}
      <div className="flex flex-wrap gap-2 justify-center">
        <div className="inline-flex rounded-full bg-muted p-1 border border-border">
          <button
            type="button"
            onClick={() => setTicketStyle('stub')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              ticketStyle === 'stub' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            Cổ điển (Stub)
          </button>
          <button
            type="button"
            onClick={() => setTicketStyle('wallet')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              ticketStyle === 'wallet' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Apple Wallet
          </button>
          <button
            type="button"
            onClick={() => setTicketStyle('pdf')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              ticketStyle === 'pdf' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            PDF / A4 In ấn
          </button>
        </div>
      </div>

      <div ref={cardRef} className="max-w-full">
        {/* Render Layout Conditional on Selected Style */}
        {ticketStyle === 'stub' && (
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
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <rect width="100" height="100" fill="white" />
                      <path d="M8 8h24v24H8zM14 14v12h12V14zM68 8h24v24H8zM74 14v12h12V14zM8 68h24v24H8zM14 74v12h12V74zM44 10h8v8h-8zM56 18h8v8h-8zM40 32h24v8H40zM72 44h8v8h-8zM84 52h8v8h-8zM40 52h8v8h-8zM52 60h16v8H52zM72 72h20v8H72zM40 78h8v14h-8zM56 84h8v8h-8z" fill="black" />
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
        )}

        {ticketStyle === 'wallet' && (
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-8 shadow-2xl flex flex-col justify-between w-full max-w-sm mx-auto min-h-[500px]">
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-44 h-44 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-44 h-44 rounded-full bg-blue-500/10 blur-3xl" />
            
            <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4 relative z-10">
              <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/25">
                TicketBox Pass
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">{ticketNumber.slice(0, 8)}</span>
            </div>

            <div className="mb-6 relative z-10 text-left">
              <h3 className="text-2xl font-black text-white leading-tight tracking-tight line-clamp-2">{concertTitle}</h3>
              <p className="text-xs text-primary font-bold mt-1.5 uppercase tracking-wider">{seatZone}</p>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-left mb-6 bg-white/[0.02] border border-white/5 p-4 rounded-2xl relative z-10 backdrop-blur-sm">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Thời gian</p>
                <p className="text-xs font-bold text-white mt-0.5">{formattedDate}</p>
                <p className="text-[11px] font-semibold text-primary mt-0.5">{time}</p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Số ghế</p>
                <p className="text-sm font-black text-white mt-0.5">{seatNumber}</p>
              </div>
              <div className="col-span-2 border-t border-white/5 pt-2 mt-1">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Địa điểm</p>
                <p className="text-xs font-semibold text-slate-300 mt-0.5 line-clamp-1">{venue}</p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center bg-white rounded-3xl p-5 shadow-xl relative z-10 mb-6">
              <div className="w-36 h-36 flex items-center justify-center overflow-hidden">
                {qrPayload ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrPayload)}`}
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
              <span className="text-[9px] font-mono text-slate-900 mt-2 font-bold tracking-widest uppercase">{ticketNumber}</span>
            </div>

            <div className="flex gap-3 relative z-10">
              <button
                onClick={handleDownload}
                className="flex-1 flex h-10 items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Tải xuống
              </button>
              <button
                onClick={handleShare}
                className="flex-1 flex h-10 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/[0.1] cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                Chia sẻ
              </button>
            </div>
          </div>
        )}

        {ticketStyle === 'pdf' && (
          <div className="bg-white text-slate-950 p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-lg w-full max-w-2xl mx-auto flex flex-col justify-between min-h-[600px]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 border-b-2 border-slate-900 pb-5 mb-5 text-left">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">VÉ ĐIỆN TỬ</h1>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">TicketBox Electronic Ticket</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Mã giao dịch / ID</p>
                <p className="font-mono text-sm font-bold text-slate-900 tracking-wider break-all">{ticketNumber}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 text-left">
              <div className="md:col-span-2 space-y-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tên sự kiện / Event Title</span>
                  <h3 className="text-xl font-black text-slate-900 mt-1 leading-snug">{concertTitle}</h3>
                </div>

                <div className="grid grid-cols-2 gap-4 border-y border-slate-200 py-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ngày / Date</span>
                    <p className="text-sm font-extrabold text-slate-900 mt-1">{formattedDate}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Giờ / Time</span>
                    <p className="text-sm font-extrabold text-slate-900 mt-1">{time}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Địa điểm / Venue</span>
                  <p className="text-sm font-extrabold text-slate-900">{venue}</p>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t border-slate-200 pt-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hạng vé / Zone</span>
                    <p className="text-sm font-black text-primary uppercase">{seatZone}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Số ghế / Seat</span>
                    <p className="text-sm font-black text-slate-900">{seatNumber}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Giá vé / Price</span>
                    <p className="text-sm font-black text-slate-900">{price.toLocaleString('vi-VN')}đ</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center border-l border-slate-200 pl-0 md:pl-6 pt-6 md:pt-0">
                <div className="border border-slate-300 p-2 bg-white rounded-xl shadow-inner">
                  <div className="w-36 h-36 overflow-hidden flex items-center justify-center">
                    {qrPayload ? (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrPayload)}`}
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
                <span className="text-[9px] font-mono text-slate-500 mt-2 font-bold tracking-widest">{ticketNumber.slice(0, 16)}</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase mt-4 text-center">HÃY GIỮ QR CODE NÀY BẢO MẬT</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 pt-4 mt-4 text-[9px] text-slate-400 leading-normal space-y-1 text-left">
              <p className="font-bold text-slate-600">ĐIỀU KHOẢN & QUY ĐỊNH / TERMS & CONDITIONS:</p>
              <p>1. Vé điện tử hợp lệ phải có QR code hiển thị rõ ràng, không bị mờ hay đứt gãy.</p>
              <p>2. Mỗi QR code chỉ có giá trị cho một (01) lần quét vào cổng duy nhất. Ban tổ chức không chịu trách nhiệm nếu vé bị sao chép trái phép.</p>
              <p>3. Vui lòng xuất trình vé điện tử trên điện thoại hoặc bản in giấy cùng giấy tờ tùy thân hợp lệ tại cổng check-in.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-slate-200">
              <button
                onClick={handleDownload}
                className="flex-1 flex h-10 items-center justify-center gap-1.5 rounded-full bg-slate-900 text-white px-4 py-2 text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Tải file in PNG
              </button>
              <button
                onClick={handleShare}
                className="flex-1 flex h-10 items-center justify-center gap-1.5 rounded-full border border-slate-300 text-slate-700 bg-white px-4 py-2 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                Chia sẻ liên kết
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden container used ONLY for generating the PNG image */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
        <div
          ref={downloadRef}
          className="w-[400px] bg-slate-950 p-8 flex flex-col items-center text-center rounded-[2.5rem] border-2 border-primary/30"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            TicketBox E-Pass
          </span>
          <h2 className="mt-4 text-xl font-black text-white leading-tight line-clamp-2">
            {concertTitle}
          </h2>
          <p className="mt-1.5 text-xs text-slate-400">{formattedDate} · {time}</p>

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

          <div className="mt-6 text-[9px] font-bold text-slate-500 tracking-wider">
            VUI LÒNG XUẤT TRÌNH VÉ NÀY TẠI CỬA BÀN SOÁT VÉ
          </div>
        </div>
      </div>
    </div>
  );
}
