import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ConcertBrowser } from '@/components/concert-browser';
import { HomeBanner } from '@/components/home-banner';
import { getConcerts } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, MapPin, Sparkles } from 'lucide-react';

interface HomePageProps {
  searchParams?: Promise<{
    q?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const initialKeyword = params?.q ?? '';
  const { items: concerts } = await getConcerts({ keyword: initialKeyword, status: 'published' });
  const featured = concerts[0] || null;

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:pb-20 lg:pt-14">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
            <Sparkles className="size-4" />
            Mùa diễn 2026 đã mở bán
          </div>
          <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-tight text-foreground md:text-6xl">
            Chọn show hay. Giữ ghế đẹp.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Đặt vé concert, lễ hội âm nhạc và sân khấu biểu diễn nổi bật tại Việt Nam.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {featured && (
              <Link
                href={`/concert/${featured.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90 active:translate-y-px"
              >
                Xem show nổi bật
                <ArrowRight className="size-4" />
              </Link>
            )}
            <Link
              href="#events"
              className="inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-3 font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary active:translate-y-px"
            >
              Lịch diễn
            </Link>
          </div>
        </div>

        {featured && (
          <div className="relative">
            <div className="relative overflow-hidden rounded-[2rem] border border-border bg-foreground shadow-2xl shadow-foreground/10">
              <div className="relative aspect-[16/11]">
                <Image src={featured.image} alt={featured.title} fill priority className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <p className="text-sm font-bold text-white/70">{featured.artist}</p>
                  <h2 className="mt-1 text-3xl font-black tracking-tight">{featured.title}</h2>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-8 left-5 right-5 rounded-3xl border border-border bg-card p-5 shadow-xl shadow-foreground/10 md:left-auto md:right-8 md:w-80">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Featured ticket</p>
                  <p className="mt-1 text-lg font-black text-foreground">{featured.price.toLocaleString('vi-VN')}đ</p>
                </div>
                <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">{featured.status}</span>
              </div>
              <div className="grid gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" />
                  {new Date(featured.date).toLocaleDateString('vi-VN')} · {featured.time}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  {featured.venue}, {featured.city}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <ConcertBrowser concerts={concerts} initialKeyword={initialKeyword} />

      <HomeBanner />

      <Footer />
    </main>
  );
}
