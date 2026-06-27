import { ConcertHero } from "@/components/concert-hero";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { getConcertById, getTicketZonesAsync } from "@/lib/api";
import { ArrowLeft, ArrowRight, Calendar, Clock, MapPin, Sparkles, User, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";

interface ConcertDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ConcertDetailPage({
  params,
}: ConcertDetailPageProps) {
  const { id } = await params;
  let concert;
  try {
    concert = await getConcertById(id);
  } catch {
    notFound();
  }

  if (!concert) {
    notFound();
  }

  const concertZones = await getTicketZonesAsync(concert.id, concert.seatZones);
  
  // Tính giá vé thấp nhất từ danh sách zones
  const minPrice = (() => {
    if (concertZones && concertZones.length > 0) {
      const prices = concertZones.map(z => Number(z.price)).filter(p => p > 0);
      if (prices.length > 0) {
        return Math.min(...prices);
      }
    }
    return 450000;
  })();

  // Bio nghệ sĩ mặc định nếu trống
  const artistBioText = concert.artistBio || "Không có thông tin tiểu sử nghệ sĩ.";

  // Danh sách khách mời & nhà tài trợ thực tế từ backend
  const guestList = concert.guestList || [];

  return (
    <main className="min-h-screen bg-background pb-20 lg:pb-0">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Quay lại danh sách
        </Link>
      </div>

      <ConcertHero
        title={concert.title}
        artist={concert.artist}
        date={concert.date}
        time={concert.time}
        venue={concert.venue}
        city={concert.city}
        image={concert.image}
        capacity={concert.capacity}
      />

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:items-start">
          
          {/* Cột thông tin chi tiết (bên trái) */}
          <div className="space-y-12 lg:col-span-2">
            
            {/* Về sự kiện */}
            <div className="rounded-[2rem] border border-border bg-card p-6 md:p-8 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2.5 text-2xl font-black tracking-tight text-foreground md:text-3xl">
                <Sparkles className="size-6 text-primary" />
                Về sự kiện
              </h2>
              <p className="text-base md:text-lg leading-relaxed text-muted-foreground whitespace-pre-line">
                {concert.description || "Chưa có mô tả chi tiết cho sự kiện này."}
              </p>
            </div>

            {/* Tiểu sử nghệ sĩ */}
            <div className="rounded-[2rem] border border-border bg-card p-6 md:p-8 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2.5 text-2xl font-black tracking-tight text-foreground md:text-3xl">
                <User className="size-6 text-primary" />
                Thông tin nghệ sĩ
              </h2>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-foreground">{concert.artist}</h3>
                  <p className="text-sm md:text-base leading-relaxed text-muted-foreground whitespace-pre-line">
                    {artistBioText}
                  </p>
                </div>
              </div>
            </div>

            {/* Danh sách Khách mời & Nhà tài trợ (phân loại rõ ràng) */}
            {guestList && guestList.length > 0 ? (
              <div className="rounded-[2rem] border border-border bg-card p-6 md:p-8 shadow-sm space-y-8">
                <div>
                  <h2 className="mb-2 flex items-center gap-2.5 text-2xl font-black tracking-tight text-foreground md:text-3xl">
                    <Users className="size-6 text-primary" />
                    Đồng hành cùng sự kiện
                  </h2>
                </div>

                {/* Nhóm 1: Nhà tài trợ (Sponsors) */}
                {(() => {
                  const sponsors = guestList.filter((g: any) => 
                    (g.guestType || "").toLowerCase() === "sponsor" || 
                    (g.guestType || "").toLowerCase() === "nhà tài trợ"
                  );
                  if (sponsors.length === 0) return null;
                  return (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-amber-500 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Nhà tài trợ sự kiện
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {sponsors.map((guest: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 transition duration-300">
                            <div className="flex size-9 items-center justify-center rounded-full text-xs font-black shrink-0 bg-amber-500/10 text-amber-600">
                              {guest.fullName?.substring(0, 1).toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-amber-950 dark:text-amber-200 text-sm truncate">{guest.fullName}</h4>
                              <span className="text-[10px] text-amber-600/80 font-bold block mt-0.5">Sponsor</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Nhóm 2: Khách mời danh dự (Guests) */}
                {(() => {
                  const guests = guestList.filter((g: any) => 
                    (g.guestType || "").toLowerCase() !== "sponsor" && 
                    (g.guestType || "").toLowerCase() !== "nhà tài trợ"
                  );
                  if (guests.length === 0) return null;
                  return (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Khách mời danh dự
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {guests.map((guest: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 p-3.5 rounded-2xl border border-primary/10 bg-primary/5 hover:border-primary/30 transition duration-300">
                            <div className="flex size-9 items-center justify-center rounded-full text-xs font-black shrink-0 bg-primary/10 text-primary">
                              {guest.fullName?.substring(0, 1).toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-foreground text-sm truncate">{guest.fullName}</h4>
                              <span className="text-[10px] text-primary/80 font-bold block mt-0.5">{guest.guestType || "VIP Guest"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="rounded-[2rem] border border-border bg-card p-6 md:p-8 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2.5 text-2xl font-black tracking-tight text-foreground md:text-3xl">
                  <Users className="size-6 text-primary" />
                  Đồng hành cùng sự kiện
                </h2>
                <p className="text-muted-foreground text-sm">Chưa có thông tin khách mời & nhà tài trợ cho sự kiện này.</p>
              </div>
            )}

          </div>

          {/* Cột Sticky Panel Mua Vé (bên phải) */}
          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-xl shadow-foreground/5 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Giá vé chỉ từ</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-primary">{minPrice.toLocaleString('vi-VN')}đ</span>
                  <span className="text-xs text-muted-foreground">/vé</span>
                </div>
              </div>

              <div className="border-t border-border/80 pt-5 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Calendar className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">Thời gian diễn ra</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(concert.date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">Giờ bắt đầu</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{concert.time} (Thời gian dự kiến)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">Địa điểm</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{concert.venue}, {concert.city}</p>
                  </div>
                </div>
              </div>

              <Link
                href={`/concert/${concert.id}/booking`}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-primary py-4 font-black text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.01] hover:bg-primary/95 transition duration-200"
              >
                Mua vé ngay
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* Floating Sticky Bottom Bar for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 p-4 shadow-2xl backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Giá từ</p>
            <p className="text-lg font-black text-primary">{minPrice.toLocaleString('vi-VN')}đ</p>
          </div>
          <Link
            href={`/concert/${concert.id}/booking`}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3 px-5 text-sm font-black text-primary-foreground transition hover:bg-primary/95"
          >
            Mua vé ngay
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}
