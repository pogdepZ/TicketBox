import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ConcertDetailLoading() {
  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-muted/50">
          <ArrowLeft className="size-4" />
          Quay lại
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 animate-pulse">
        {/* Hero Skeleton */}
        <div className="relative overflow-hidden rounded-[2rem] bg-muted aspect-[16/7] w-full flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground/30" />
        </div>

        <section className="py-12 lg:pb-14">
          <div className="mb-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <div className="h-10 w-48 rounded-lg bg-muted"></div>
            </div>
            <div>
              <div className="space-y-3">
                <div className="h-4 w-full rounded bg-muted"></div>
                <div className="h-4 w-[90%] rounded bg-muted"></div>
                <div className="h-4 w-[95%] rounded bg-muted"></div>
                <div className="h-4 w-[80%] rounded bg-muted"></div>
              </div>
              <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 rounded-2xl bg-muted"></div>
                ))}
              </div>
            </div>
          </div>
          
          {/* SeatMap Skeleton */}
          <div className="mt-12 h-[500px] w-full rounded-[2rem] bg-muted flex items-center justify-center">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
