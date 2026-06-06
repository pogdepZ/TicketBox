import Link from 'next/link';
import Image from 'next/image';
import { Heart, MapPin, Calendar, Clock } from 'lucide-react';

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
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link href={`/concert/${id}`}>
      <div className="group bg-card rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border border-border hover:border-primary">
        <div className="relative h-48 overflow-hidden bg-muted">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <button className="absolute top-3 right-3 p-2 bg-black/50 rounded-full hover:bg-black/70 transition">
            <Heart className="w-5 h-5 text-white" />
          </button>
          {soldOut && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <p className="text-white font-bold text-lg">Hết vé</p>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">{artist}</p>

          <div className="space-y-2 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {formattedDate}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {time}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {venue}, {city}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="font-bold text-primary">
              {price.toLocaleString('vi-VN')}đ
            </div>
            <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 transition">
              Xem chi tiết
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
