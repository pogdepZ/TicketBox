import Image from 'next/image';
import { MapPin, Calendar, Clock, Users } from 'lucide-react';
import { formatViDate } from '@/lib/format';

interface ConcertHeroProps {
  title: string;
  artist: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  image: string;
  capacity: number;
}

export function ConcertHero({
  title,
  artist,
  date,
  time,
  venue,
  city,
  image,
  capacity,
}: ConcertHeroProps) {
  const formattedDate = formatViDate(date, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="relative mx-auto mt-4 max-w-7xl overflow-hidden rounded-[2rem] border border-border bg-foreground shadow-2xl shadow-foreground/10">
      <Image
        src={image}
        alt={title}
        fill
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10" />

      <div className="relative flex min-h-[460px] flex-col justify-end p-5 md:p-8 lg:p-10">
        <div className="max-w-5xl">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/80 backdrop-blur">{artist}</p>
          <h1 className="mb-8 max-w-4xl text-4xl font-black leading-none tracking-tight text-white md:text-6xl">{title}</h1>

          <div className="grid gap-3 rounded-3xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur-md sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <Calendar className="size-5 text-primary" />
              <div>
                <p className="text-xs font-semibold text-white/50">Ngày</p>
                <p className="font-bold">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="size-5 text-primary" />
              <div>
                <p className="text-xs font-semibold text-white/50">Giờ</p>
                <p className="font-bold">{time}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="size-5 text-primary" />
              <div>
                <p className="text-xs font-semibold text-white/50">Địa điểm</p>
                <p className="font-bold">{venue}, {city}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="size-5 text-primary" />
              <div>
                <p className="text-xs font-semibold text-white/50">Sức chứa</p>
                <p className="font-bold">{capacity.toLocaleString('vi-VN')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
