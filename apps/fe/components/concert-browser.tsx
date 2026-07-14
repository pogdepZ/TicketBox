"use client";

import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, LayoutGrid, LayoutList, CalendarRange, MapPin, Calendar, CircleDollarSign } from 'lucide-react';
import { ConcertCard } from '@/components/concert-card';
import { Reveal } from '@/components/reveal';

interface ConcertItem {
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
  genre?: string;
}

interface ConcertBrowserProps {
  concerts: ConcertItem[];
  initialKeyword?: string;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function scrollToEvents() {
  requestAnimationFrame(() => {
    document.getElementById('events')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  });
}

interface ConcertRowProps {
  groupName: string;
  list: ConcertItem[];
}

function ConcertRow({ groupName, list }: ConcertRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const updateArrows = () => {
    const container = scrollRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowLeft(scrollLeft > 5);
      setShowRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      updateArrows();
      container.addEventListener('scroll', updateArrows);
      window.addEventListener('resize', updateArrows);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', updateArrows);
      }
      window.removeEventListener('resize', updateArrows);
    };
  }, [list]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollRef.current;
    if (container) {
      const scrollAmount = container.clientWidth * 0.75;
      const targetScrollLeft =
        direction === 'left'
          ? container.scrollLeft - scrollAmount
          : container.scrollLeft + scrollAmount;

      const maxScroll = container.scrollWidth - container.clientWidth;
      const boundedTarget = Math.max(0, Math.min(targetScrollLeft, maxScroll));

      const start = container.scrollLeft;
      const change = boundedTarget - start;
      const startTime = performance.now();
      const duration = 650;

      const easeOutExpo = (t: number): number => {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      };

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutExpo(progress);

        container.scrollLeft = start + change * easedProgress;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          updateArrows();
        }
      };

      requestAnimationFrame(animate);
    }
  };

  return (
    <Reveal className="space-y-4" variant="up">
      <style>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-extrabold text-foreground border-l-4 border-primary pl-3">
            {groupName}
          </h3>
          <span className="text-xs font-bold text-muted-foreground bg-card border border-border px-3 py-1 rounded-full shadow-sm">
            {list.length} show
          </span>
        </div>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!showLeft}
            className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-primary/50 hover:text-primary hover:-translate-x-0.5 active:scale-90 disabled:opacity-20 disabled:pointer-events-none disabled:translate-x-0 cursor-pointer"
            aria-label="Cuộn sang trái"
          >
            <ChevronLeft className="size-4.5" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            disabled={!showRight}
            className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-primary/50 hover:text-primary hover:translate-x-0.5 active:scale-90 disabled:opacity-20 disabled:pointer-events-none disabled:translate-x-0 cursor-pointer"
            aria-label="Cuộn sang phải"
          >
            <ChevronRight className="size-4.5" />
          </button>
        </div>
      </div>
      
      <div className="relative -mx-4 px-4">
        <div
          className={`absolute left-0 top-0 bottom-4 w-24 bg-gradient-to-r from-background via-background/40 to-transparent pointer-events-none z-10 transition-opacity duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            showLeft ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div
          className={`absolute right-0 top-0 bottom-4 w-24 bg-gradient-to-l from-background via-background/40 to-transparent pointer-events-none z-10 transition-opacity duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            showRight ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div
          ref={scrollRef}
          className="w-full overflow-x-auto pb-4 scrollbar-none"
        >
          <div className="flex gap-6 w-max">
            {list.map((concert, index) => (
              <Reveal
                key={concert.id}
                className="w-[280px] sm:w-[320px] md:w-[360px] shrink-0"
                delay={Math.min(index, 5) * 55}
                variant="scale"
              >
                <ConcertCard {...concert} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function ConcertListItem({ id, slug, title, artist, date, time, venue, city, image, price, soldOut }: ConcertItem) {
  const formattedDate = new Date(date).toLocaleDateString('vi-VN', {
    weekday: 'short',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });

  return (
    <div className="flex flex-col md:flex-row items-center gap-6 p-5 rounded-3xl border border-border bg-card shadow-sm hover:border-primary/45 transition-all duration-300 w-full relative overflow-hidden group">
      <div className="relative w-full md:w-44 h-44 shrink-0 rounded-2xl overflow-hidden bg-muted">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {soldOut && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <span className="text-white text-xs font-black uppercase tracking-wider bg-destructive px-3 py-1 rounded-full">
              Hết vé
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between h-full w-full">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
              {artist}
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-3">
            {title}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 shrink-0 text-primary" />
              <span>{formattedDate} · {time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-primary" />
              <span className="line-clamp-1">{venue}, {city}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 pt-4 border-t border-border/40">
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-muted-foreground">Giá từ</span>
            <span className="text-xl font-black text-primary">{price.toLocaleString('vi-VN')}đ</span>
          </div>

          <Link
            href={`/concert/${slug || id}`}
            className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 font-bold transition-all cursor-pointer ${
              soldOut
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/15 hover:-translate-y-0.5 active:translate-y-px'
            }`}
          >
            {soldOut ? 'Hết vé' : 'Mua vé ngay'}
          </Link>
        </div>
      </div>
    </div>
  );
}

function CalendarEventRow({ id, slug, title, artist, date, time, venue, city, price, soldOut }: ConcertItem) {
  const eventDate = new Date(date);
  const day = eventDate.getDate();
  const month = eventDate.toLocaleDateString('vi-VN', { month: 'short' });
  const weekday = eventDate.toLocaleDateString('vi-VN', { weekday: 'short' });

  return (
    <div className="flex items-center gap-5 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all duration-300 w-full group text-left">
      {/* Date badge */}
      <div className="w-16 h-16 shrink-0 rounded-2xl border border-border bg-muted flex flex-col items-center justify-center shadow-inner">
        <span className="text-[10px] font-black uppercase text-primary tracking-wider">{weekday}</span>
        <span className="text-2xl font-black text-foreground mt-0.5">{day}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-base font-extrabold text-foreground group-hover:text-primary transition-colors truncate">
          {title}
        </h4>
        <p className="text-xs font-semibold text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
          <span className="text-primary font-bold">{artist}</span>
          <span>•</span>
          <span className="truncate">{venue}, {city}</span>
        </p>
      </div>

      {/* Action */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-[10px] text-muted-foreground">Giá từ</span>
          <span className="text-sm font-black text-primary">{price.toLocaleString('vi-VN')}đ</span>
        </div>
        <Link
          href={`/concert/${slug || id}`}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
            soldOut
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {soldOut ? 'Hết' : 'Đặt vé'}
        </Link>
      </div>
    </div>
  );
}

export function ConcertBrowser({ concerts, initialKeyword = '' }: ConcertBrowserProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [city, setCity] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'calendar'>('grid');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlCity = params.get('city') || 'all';
      setCity(urlCity);
    }
  }, []);

  const cities = useMemo(
    () => Array.from(new Set(concerts.map((concert) => concert.city))).filter(Boolean).sort(),
    [concerts],
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__ticketbox_cities = cities;
      window.dispatchEvent(new CustomEvent('ticketbox-cities-loaded', { detail: { cities } }));
    }
  }, [cities]);

  useEffect(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const isReload = navigation?.type === 'reload';

    if (isReload) {
      setKeyword('');
      setCity('all');

      if (window.location.search || window.location.hash) {
        const url = new URL(window.location.href);
        url.searchParams.delete('q');
        url.searchParams.delete('city');
        url.hash = '';
        window.history.replaceState(null, '', `${url.pathname}${url.search}`);
      }

      window.dispatchEvent(new CustomEvent('ticketbox-filter-change', {
        detail: { keyword: '', city: 'all' }
      }));

      return;
    }

    setKeyword(initialKeyword);

    if (initialKeyword.trim().length === 0) {
      return;
    }

    scrollToEvents();
  }, [initialKeyword]);

  useEffect(() => {
    function handleFilterChange(event: Event) {
      const detail = (event as CustomEvent<{ keyword?: string; city?: string }>).detail;
      if (detail) {
        if (detail.keyword !== undefined) setKeyword(detail.keyword);
        if (detail.city !== undefined) setCity(detail.city);
        scrollToEvents();
      }
    }

    window.addEventListener('ticketbox-filter-change', handleFilterChange);
    return () => {
      window.removeEventListener('ticketbox-filter-change', handleFilterChange);
    };
  }, []);

  const filteredConcerts = useMemo(() => {
    const normalizedKeyword = normalize(keyword.trim());

    return concerts.filter((concert) => {
      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        normalize([
          concert.title,
          concert.artist,
          concert.venue,
          concert.city,
        ].join(' ')).includes(normalizedKeyword);

      const matchesCity = city === 'all' || concert.city === city;

      return matchesKeyword && matchesCity;
    });
  }, [city, concerts, keyword]);

  const groupedConcerts = useMemo(() => {
    const groups: Record<string, typeof concerts> = {};
    filteredConcerts.forEach((concert) => {
      const g = concert.genre || "Khác";
      if (!groups[g]) {
        groups[g] = [];
      }
      groups[g].push(concert);
    });
    return groups;
  }, [filteredConcerts]);

  // Group concerts by month for Calendar view
  const concertsByMonth = useMemo(() => {
    const groups: Record<string, typeof concerts> = {};
    const sorted = [...filteredConcerts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sorted.forEach((concert) => {
      const d = new Date(concert.date);
      if (isNaN(d.getTime())) return;
      const monthYear = d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(concert);
    });
    return groups;
  }, [filteredConcerts]);

  const hasFilters = keyword.trim().length > 0 || city !== 'all';

  function clearFilters() {
    setKeyword('');
    setCity('all');

    window.dispatchEvent(new CustomEvent('ticketbox-filter-change', {
      detail: { keyword: '', city: 'all' }
    }));

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.delete('q');
      params.delete('city');
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState(null, '', newUrl);
    }
  }

  return (
    <section id="events" className="mx-auto max-w-7xl px-4 py-20">
      <Reveal className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl text-left">
          <h2 className="text-3xl font-black tracking-tight text-foreground md:text-5xl">Sự kiện nổi bật</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Tìm show theo nghệ sĩ, địa điểm, hoặc thể loại bạn quan tâm.
          </p>
        </div>

        {/* View Mode Selector */}
        {filteredConcerts.length > 0 && (
          <div className="inline-flex rounded-full bg-muted p-1 border border-border self-start lg:self-end">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-full transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Xem dạng Lưới"
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-full transition cursor-pointer ${
                viewMode === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Xem dạng Danh sách"
            >
              <LayoutList className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-full transition cursor-pointer ${
                viewMode === 'calendar' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Xem dạng Lịch diễn"
            >
              <CalendarRange className="size-4" />
            </button>
          </div>
        )}
      </Reveal>

      {filteredConcerts.length > 0 ? (
        viewMode === 'grid' ? (
          hasFilters ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredConcerts.map((concert, index) => (
                <Reveal key={concert.id} delay={Math.min(index, 8) * 45} variant="scale">
                  <ConcertCard {...concert} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="space-y-12">
              {Object.entries(groupedConcerts).map(([groupName, list]) => (
                <ConcertRow key={groupName} groupName={groupName} list={list} />
              ))}
            </div>
          )
        ) : viewMode === 'list' ? (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            {filteredConcerts.map((concert, index) => (
              <Reveal key={concert.id} delay={Math.min(index, 6) * 50} variant="up">
                <ConcertListItem {...concert} />
              </Reveal>
            ))}
          </div>
        ) : (
          /* Calendar view */
          <div className="max-w-3xl mx-auto space-y-10">
            {Object.entries(concertsByMonth).map(([monthYear, monthConcerts]) => (
              <div key={monthYear} className="space-y-4">
                <h3 className="text-lg font-black text-foreground border-b border-border/60 pb-2 capitalize tracking-tight flex items-center gap-2 text-left">
                  <Calendar className="size-4.5 text-primary" />
                  {monthYear}
                </h3>
                <div className="flex flex-col gap-4">
                  {monthConcerts.map((concert, index) => (
                    <Reveal key={concert.id} delay={Math.min(index, 6) * 40} variant="up">
                      <CalendarEventRow {...concert} />
                    </Reveal>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="rounded-[2rem] border border-dashed border-border bg-card p-10 text-center">
          <h3 className="text-2xl font-black text-foreground">Không tìm thấy sự kiện phù hợp</h3>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Thử đổi từ khóa hoặc tỉnh/thành để xem thêm các show đang mở bán.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground transition hover:bg-primary/90"
          >
            Xem tất cả sự kiện
          </button>
        </div>
      )}
      {/* Infinite Partner Logos & Concert Images Marquees */}
      <style>{`
        @keyframes marquee-scroll {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        .animate-marquee {
          animation: marquee-scroll 25s linear infinite;
        }
        .animate-marquee-images {
          animation: marquee-scroll 35s linear infinite;
        }
        .animate-marquee:hover, .animate-marquee-images:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Sponsor/Partner Logos Marquee */}
      <div className="mt-24 border-t border-border/40 pt-14 pb-4 overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        
        <h4 className="text-center text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground/80 mb-8">
          Đối tác & Nhà tài trợ đồng hành
        </h4>
        
        <div className="w-full overflow-hidden flex">
          <div className="flex gap-16 min-w-full justify-around animate-marquee whitespace-nowrap">
            <div className="flex gap-16 items-center shrink-0">
              <span className="text-lg md:text-xl font-black text-muted-foreground/30 hover:text-primary transition duration-300">SPOTIFY</span>
              <span className="text-lg md:text-xl font-black text-muted-foreground/30 hover:text-primary transition duration-300">UNIVERSAL MUSIC</span>
              <span className="text-lg md:text-xl font-black text-muted-foreground/30 hover:text-primary transition duration-300">SONY MUSIC</span>
              <span className="text-lg md:text-xl font-black text-muted-foreground/30 hover:text-primary transition duration-300">WARNER MUSIC</span>
              <span className="text-lg md:text-xl font-black text-muted-foreground/30 hover:text-primary transition duration-300">LIVE NATION</span>
              <span className="text-lg md:text-xl font-black text-muted-foreground/30 hover:text-primary transition duration-300">TICKETMASTER</span>
            </div>
            <div className="flex gap-16 items-center shrink-0" aria-hidden="true">
              <span className="text-lg md:text-xl font-black text-muted-foreground/30 hover:text-primary transition duration-300">SPOTIFY</span>
              <span className="text-lg md:text-xl font-black text-muted-foreground/30 hover:text-primary transition duration-300">UNIVERSAL MUSIC</span>
              <span className="text-lg md:text-xl font-black text-muted-foreground/30 hover:text-primary transition duration-300">SONY MUSIC</span>
              <span className="text-lg md:text-xl font-black text-muted-foreground/30 hover:text-primary transition duration-300">WARNER MUSIC</span>
              <span className="text-lg md:text-xl font-black text-muted-foreground/30 hover:text-primary transition duration-300">LIVE NATION</span>
              <span className="text-lg md:text-xl font-black text-muted-foreground/30 hover:text-primary transition duration-300">TICKETMASTER</span>
            </div>
          </div>
        </div>
      </div>

      {/* Concert Images Marquee */}
      {concerts && concerts.length > 0 && (
        <div className="mt-8 pb-10 overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          
          <h4 className="text-center text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground/80 mb-8">
            Khoảnh khắc sự kiện nổi bật
          </h4>

          <div className="w-full overflow-hidden flex">
            <div className="flex gap-6 min-w-full animate-marquee-images whitespace-nowrap">
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
      )}
    </section>
  );
}
