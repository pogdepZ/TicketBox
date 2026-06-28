import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ConcertBrowser } from '@/components/concert-browser';
import { HomeBanner } from '@/components/home-banner';
import { Reveal } from '@/components/reveal';
import { FeaturedCarousel } from '@/components/featured-carousel';
import { getConcerts } from '@/lib/api';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

interface HomePageProps {
  searchParams?: Promise<{
    q?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const initialKeyword = params?.q ?? '';
  const { items: concerts } = await getConcerts({ keyword: initialKeyword, status: 'published', limit: 100 });
  const featured = concerts[0] || null;

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 md:pb-24 lg:pb-32 pt-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:pt-14">
        <div>
          <Reveal className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary shadow-sm shadow-primary/10" variant="scale">
            <Sparkles className="size-4" />
            Mùa diễn 2026 đã mở bán
          </Reveal>
          <Reveal delay={90}>
            <h1 className="max-w-3xl text-5xl font-black leading-tight tracking-tight text-foreground md:text-6xl">
            Chọn show hay. Giữ ghế đẹp.
            </h1>
          </Reveal>
          <Reveal delay={170}>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              Đặt vé concert, lễ hội âm nhạc và sân khấu biểu diễn nổi bật tại Việt Nam.
            </p>
          </Reveal>
          <Reveal delay={250} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#events"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition duration-300 hover:-translate-y-1 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25 active:translate-y-px"
            >
              Xem lịch diễn
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        </div>

        {concerts.length > 0 && (
          <Reveal className="relative w-full animate-fade-in" delay={140} variant="scale">
            <FeaturedCarousel concerts={concerts} />
          </Reveal>
        )}
      </section>

      <ConcertBrowser concerts={concerts} initialKeyword={initialKeyword} />

      <HomeBanner />

      <Footer />
    </main>
  );
}
