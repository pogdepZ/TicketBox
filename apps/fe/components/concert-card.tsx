"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, Heart, MapPin } from 'lucide-react';
import { MouseEvent, useEffect, useState } from 'react';
import { formatViDate } from '@/lib/format';

interface ConcertCardProps {
  id: string;
  slug?: string;
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

const FAVORITES_KEY = 'ticketbox-favorite-concerts';

function getFavorites() {
  const stored = window.localStorage.getItem(FAVORITES_KEY);
  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

export function ConcertCard({
  id,
  slug,
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
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    setIsFavorite(getFavorites().includes(id));
  }, [id]);

  const formattedDate = formatViDate(date, {
    day: '2-digit',
    month: '2-digit',
  });

  function handleToggleFavorite(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const favorites = getFavorites();
    const nextFavorites = favorites.includes(id)
      ? favorites.filter((concertId) => concertId !== id)
      : [...favorites, id];

    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(nextFavorites));
    setIsFavorite(nextFavorites.includes(id));
  }

  const linkSlug = slug || id;

  return (
    <Link href={`/concert/${linkSlug}`} className="group block h-full focus-visible:outline-none">
      <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-focus-visible:-translate-y-1 group-focus-visible:border-primary/45 group-focus-visible:shadow-xl group-focus-visible:shadow-primary/10 hover:-translate-y-1.5 hover:border-primary/45 hover:shadow-xl hover:shadow-primary/10">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted flex-shrink-0">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-focus-visible:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute left-4 top-4 rounded-2xl bg-card/95 px-3 py-2 text-center shadow-lg backdrop-blur">
            <p className="font-mono text-xs font-semibold text-muted-foreground">NGÀY</p>
            <p className="text-sm font-black text-foreground">{formattedDate}</p>
          </div>
          <button
            type="button"
            onClick={handleToggleFavorite}
            className={`absolute right-4 top-4 grid size-10 place-items-center rounded-full backdrop-blur transition duration-300 hover:scale-110 active:scale-95 ${
              isFavorite ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' : 'bg-black/45 text-white hover:bg-primary'
            }`}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? 'Bỏ lưu sự kiện' : 'Lưu sự kiện'}
            title={isFavorite ? 'Đã lưu' : 'Lưu sự kiện'}
          >
            <Heart className={`size-5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/65">
              <p className="rounded-full border border-white/25 bg-white/10 px-5 py-2 text-lg font-bold text-white backdrop-blur">Hết vé</p>
            </div>
          )}
        </div>
        <div className="p-5 flex flex-col flex-grow">
          <h3 className="text-xl font-black leading-tight text-foreground transition group-hover:text-primary line-clamp-2 min-h-[3.5rem] flex-shrink-0">
            {title}
          </h3>
          <p className="mt-1 text-sm font-medium text-muted-foreground line-clamp-1 flex-shrink-0">{artist}</p>

          <div className="mt-4 mb-5 space-y-2 text-sm text-muted-foreground flex-grow">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-primary flex-shrink-0" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-primary flex-shrink-0" />
              <span>{time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-primary flex-shrink-0" />
              <span className="line-clamp-1">{venue}, {city}</span>
            </div>
          </div>

          <div className="mt-auto border-t border-border pt-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Từ</p>
              <p className="text-lg font-black text-foreground">{price.toLocaleString('vi-VN')}đ</p>
            </div>
            <button className="rounded-full bg-foreground px-4 py-2 text-sm font-bold text-background transition duration-300 hover:-translate-y-0.5 hover:bg-primary hover:shadow-lg hover:shadow-primary/20 active:translate-y-px cursor-pointer">
              Xem chi tiết
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
