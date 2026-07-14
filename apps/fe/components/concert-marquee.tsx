"use client";

import Link from 'next/link';

interface ConcertItem {
  id: string;
  slug?: string;
  title: string;
  artist: string;
  image: string;
}

interface ConcertMarqueeProps {
  concerts: ConcertItem[];
}

export function ConcertMarquee({ concerts }: ConcertMarqueeProps) {
  if (!concerts || concerts.length === 0) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 my-8 animate-fade-in">
      <div className="py-12 overflow-hidden relative w-full">
      <style>{`
        @keyframes marquee-scroll-images {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        .animate-marquee-images-new {
          animation: marquee-scroll-images 25s linear infinite;
        }
        .animate-marquee-images-new:hover {
          animation-play-state: paused;
        }
      `}</style>
      
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      
      <h4 className="text-center text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground/80 mb-6">
        Khoảnh khắc sự kiện nổi bật
      </h4>

      <div className="w-full overflow-hidden flex">
        <div className="flex gap-6 min-w-full animate-marquee-images-new whitespace-nowrap">
          <div className="flex gap-6 shrink-0">
            {concerts.map((c) => (
              <Link href={`/concert/${c.slug || c.id}`} key={`m1-${c.id}`} className="w-56 h-36 relative rounded-2xl overflow-hidden border border-border/60 bg-muted shrink-0 group/img shadow-md block">
                <img
                  src={c.image}
                  alt={c.title}
                  className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3.5 text-left">
                  <p className="text-xs font-black text-white truncate leading-tight">{c.title}</p>
                  <p className="text-[10px] font-bold text-primary truncate mt-1">{c.artist}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="flex gap-6 shrink-0" aria-hidden="true">
            {concerts.map((c) => (
              <Link href={`/concert/${c.slug || c.id}`} key={`m2-${c.id}`} className="w-56 h-36 relative rounded-2xl overflow-hidden border border-border/60 bg-muted shrink-0 group/img shadow-md block">
                <img
                  src={c.image}
                  alt={c.title}
                  className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3.5 text-left">
                  <p className="text-xs font-black text-white truncate leading-tight">{c.title}</p>
                  <p className="text-[10px] font-bold text-primary truncate mt-1">{c.artist}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
