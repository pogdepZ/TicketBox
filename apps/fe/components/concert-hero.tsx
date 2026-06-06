import Image from 'next/image';
import { MapPin, Calendar, Clock, Users } from 'lucide-react';

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
  const formattedDate = new Date(date).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="relative h-96 w-full overflow-hidden">
      <Image
        src={image}
        alt={title}
        fill
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/40" />

      <div className="absolute inset-0 flex flex-col justify-end p-8">
        <div>
          <p className="text-accent mb-2 font-semibold">{artist}</p>
          <h1 className="text-5xl font-bold text-white mb-6">{title}</h1>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-gray-400">Ngày</p>
                <p className="font-semibold">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-gray-400">Giờ</p>
                <p className="font-semibold">{time}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-gray-400">Địa điểm</p>
                <p className="font-semibold">{venue}, {city}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-gray-400">Sức chứa</p>
                <p className="font-semibold">{capacity.toLocaleString('vi-VN')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
