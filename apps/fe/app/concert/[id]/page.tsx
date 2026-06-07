import { ConcertHero } from '@/components/concert-hero';
import { SeatMap } from '@/components/seat-map';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { concerts, getSeatsByConcertId, getTicketZonesByConcertId } from '@/lib/mock-data';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface ConcertDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ConcertDetailPage({ params }: ConcertDetailPageProps) {
  const { id } = await params;
  const concert = concerts.find((c) => c.id === id);

  if (!concert) {
    notFound();
  }

  const concertZones = getTicketZonesByConcertId(concert.id);
  const concertSeats = getSeatsByConcertId(concert.id);

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Quay lại
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

      <section className="mx-auto max-w-7xl px-4 py-12 pb-64 lg:pb-14">
        <div className="mb-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">Về sự kiện</h2>
          </div>
          <div>
            <p className="text-lg leading-8 text-muted-foreground">
            {concert.description}
          </p>
            <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ['Thể loại', concert.genre],
                ['Sức chứa', concert.capacity.toLocaleString('vi-VN')],
                ['Ngôn ngữ', concert.language],
                ['Độ tuổi', concert.ageLimit],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                  <p className="font-black text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SeatMap concertId={concert.id} concertTitle={concert.title} zones={concertZones} seats={concertSeats} />
      </section>

      <Footer />
    </main>
  );
}
