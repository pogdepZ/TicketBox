import { SeatMap } from "@/components/seat-map";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { getConcertById, getTicketZonesAsync, getSeatsAsync } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface BookingPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BookingPage({ params }: BookingPageProps) {
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
  const concertSeats = await getSeatsAsync(concert.id, concert.seatZones);

  let svgContent = "";
  if (concert.seatMapSvgUrl) {
    try {
      const response = await fetch(concert.seatMapSvgUrl, {
        cache: "no-store",
      });
      if (response.ok) {
        svgContent = await response.text();
      } else {
        console.warn(
          `Failed to fetch seatmap SVG from ${concert.seatMapSvgUrl}: status ${response.status}`,
        );
      }
    } catch (e) {
      console.error("Error fetching seatmap SVG in server component:", e);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-5">
        <Link
          href={`/concert/${concert.id}`}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Quay lại thông tin sự kiện
        </Link>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-8 pb-32">
        <SeatMap
          concertId={concert.id}
          concertTitle={concert.title}
          zones={concertZones}
          seats={concertSeats}
          svgContent={svgContent}
        />
      </section>

      <Footer />
    </main>
  );
}
