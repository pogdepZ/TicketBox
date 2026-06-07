import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, Heart, MapPin } from 'lucide-react';

interface ConcertCardProps {
  id: string;
  title: string;
  artist: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  image: string;
  price: number;
  soldOut?: boolean;
}

export function ConcertCard({
  id,
  title,
  artist,
  date,
  time,
  venue,
  city,
  image,
  price,
  soldOut,
}: ConcertCardProps) {
  const formattedDate = new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });

  return (
    <Link href={`/concert/${id}`} className="group block">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/45 hover:shadow-xl hover:shadow-primary/10">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute left-4 top-4 rounded-2xl bg-card/95 px-3 py-2 text-center shadow-lg backdrop-blur">
            <p className="font-mono text-xs font-semibold text-muted-foreground">NGÀY</p>
            <p className="text-sm font-black text-foreground">{formattedDate}</p>
          </div>
          <button className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-primary" aria-label="Lưu sự kiện">
            <Heart className="size-5" />
          </button>
          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/65">
              <p className="rounded-full border border-white/25 bg-white/10 px-5 py-2 text-lg font-bold text-white backdrop-blur">Hết vé</p>
            </div>
          )}
        </div>
        <div className="p-5">
          <h3 className="text-xl font-black leading-tight text-foreground transition group-hover:text-primary">
            {title}
          </h3>
          <p className="mt-1 text-sm font-medium text-muted-foreground">{artist}</p>

          <div className="my-5 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              {formattedDate}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              {time}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              {venue}, {city}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Từ</p>
              <p className="text-lg font-black text-foreground">{price.toLocaleString('vi-VN')}đ</p>
            </div>
            <button className="rounded-full bg-foreground px-4 py-2 text-sm font-bold text-background transition hover:bg-primary">
              Xem chi tiết
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
