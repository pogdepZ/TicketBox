import { ConcertHero } from '@/components/concert-hero';
import { SeatMap } from '@/components/seat-map';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { concerts, seats, ticketZones } from '@/lib/mock-data';
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

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
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

      <section className="max-w-7xl mx-auto px-4 py-12 pb-64 lg:pb-12">
        <div className="bg-card rounded-lg p-8 border border-border mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Về sự kiện</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            {concert.description}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-muted rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Thể loại</p>
              <p className="font-semibold text-foreground">{concert.genre}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Sức chứa</p>
              <p className="font-semibold text-foreground">{concert.capacity.toLocaleString('vi-VN')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Ngôn ngữ</p>
              <p className="font-semibold text-foreground">{concert.language}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Độ tuổi</p>
              <p className="font-semibold text-foreground">{concert.ageLimit}</p>
            </div>
          </div>
        </div>

        <SeatMap concertTitle={concert.title} zones={ticketZones} seats={seats} />
      </section>

      <Footer />
    </main>
  );
}
