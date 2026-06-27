"use client";

import { useEffect, useMemo, useState, useRef } from 'react';
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ConcertCard } from '@/components/concert-card';

interface ConcertBrowserProps {
  concerts: Array<{
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
    genre?: string;
  }>;
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
  list: any[];
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
      // Temporarily disable scroll-snap to prevent browser layout conflicts during custom animation
      container.style.scrollSnapType = 'none';

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
      const duration = 650; // Decelerating slightly faster (650ms) for snappy, premium UX response

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
          // Re-enable scroll snap after animation finishes to support manual touch gestures
          container.style.scrollSnapType = 'x mandatory';
          // Ensure arrow states and gradient masks update correctly after navigation completion
          updateArrows();
        }
      };

      requestAnimationFrame(animate);
    }
  };

  return (
    <div className="space-y-4">
      <style>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
      {/* Header: Title + Show Badge + Grouped Arrow Controls */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-extrabold text-foreground border-l-4 border-primary pl-3">
            {groupName}
          </h3>
          <span className="text-xs font-bold text-muted-foreground bg-card border border-border px-3 py-1 rounded-full shadow-sm">
            {list.length} show
          </span>
        </div>
        
        {/* Navigation Buttons grouped together on the top right */}
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
      
      {/* Body: Horizontal List Container with Fade Masks */}
      <div className="relative -mx-4 px-4">
        {/* Left Edge Fade: visible only when scrolled to the right */}
        <div
          className={`absolute left-0 top-0 bottom-4 w-24 bg-gradient-to-r from-background via-background/40 to-transparent pointer-events-none z-10 transition-opacity duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            showLeft ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Right Edge Fade: visible only when there is more content to the right */}
        <div
          className={`absolute right-0 top-0 bottom-4 w-24 bg-gradient-to-l from-background via-background/40 to-transparent pointer-events-none z-10 transition-opacity duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            showRight ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Horizontal scroll content wrapper */}
        <div
          ref={scrollRef}
          className="w-full overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory"
        >
          <div className="flex gap-6 w-max">
            {list.map((concert) => (
              <div key={concert.id} className="w-[280px] sm:w-[320px] md:w-[360px] shrink-0 snap-start">
                <ConcertCard {...concert} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConcertBrowser({ concerts, initialKeyword = '' }: ConcertBrowserProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [city, setCity] = useState('all');
  const [genre, setGenre] = useState('all');

  useEffect(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const isReload = navigation?.type === 'reload';

    if (isReload) {
      setKeyword('');
      setCity('all');
      setGenre('all');

      if (window.location.search || window.location.hash) {
        const url = new URL(window.location.href);
        url.searchParams.delete('q');
        url.hash = '';
        window.history.replaceState(null, '', `${url.pathname}${url.search}`);
      }

      return;
    }

    setKeyword(initialKeyword);

    if (initialKeyword.trim().length === 0) {
      return;
    }

    scrollToEvents();
  }, [initialKeyword]);

  useEffect(() => {
    function handleNavbarSearch(event: Event) {
      const query = (event as CustomEvent<{ query?: string }>).detail?.query ?? '';

      setKeyword(query);
      setCity('all');
      setGenre('all');
      scrollToEvents();
    }

    window.addEventListener('ticketbox-navbar-search', handleNavbarSearch);

    return () => {
      window.removeEventListener('ticketbox-navbar-search', handleNavbarSearch);
    };
  }, []);

  const cities = useMemo(
    () => Array.from(new Set(concerts.map((concert) => concert.city))).sort(),
    [concerts],
  );

  const genres = useMemo(
    () => Array.from(new Set(concerts.map((concert) => concert.genre).filter(Boolean))).sort(),
    [concerts],
  );

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
          concert.genre ?? '',
        ].join(' ')).includes(normalizedKeyword);

      const matchesCity = city === 'all' || concert.city === city;
      const matchesGenre = genre === 'all' || concert.genre === genre;

      return matchesKeyword && matchesCity && matchesGenre;
    });
  }, [city, concerts, genre, keyword]);

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

  const hasFilters = keyword.trim().length > 0 || city !== 'all' || genre !== 'all';

  function clearFilters() {
    setKeyword('');
    setCity('all');
    setGenre('all');
  }

  return (
    <section id="events" className="mx-auto max-w-7xl px-4 py-20">
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-black tracking-tight text-foreground md:text-5xl">Sự kiện nổi bật</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Tìm show theo nghệ sĩ, địa điểm, hoặc thể loại bạn quan tâm.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-muted-foreground shadow-sm">
          <SlidersHorizontal className="size-4 text-primary" />
          {filteredConcerts.length} / {concerts.length} sự kiện
        </div>
      </div>

      <div className="mb-8 grid gap-3 rounded-[2rem] border border-border bg-card p-3 shadow-sm md:grid-cols-[1fr_220px_220px_auto]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm concert, nghệ sĩ, địa điểm"
            aria-label="Tìm kiếm sự kiện"
            className="h-12 w-full rounded-full border border-border bg-background pl-11 pr-4 text-sm transition focus:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>

        <select
          value={city}
          onChange={(event) => setCity(event.target.value)}
          aria-label="Lọc theo tỉnh thành"
          className="h-12 rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground transition focus:outline-none focus:ring-4 focus:ring-primary/15"
        >
          <option value="all">Tất cả tỉnh/thành</option>
          {cities.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={genre}
          onChange={(event) => setGenre(event.target.value)}
          aria-label="Lọc theo thể loại"
          className="h-12 rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground transition focus:outline-none focus:ring-4 focus:ring-primary/15"
        >
          <option value="all">Tất cả thể loại</option>
          {genres.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={clearFilters}
          disabled={!hasFilters}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-bold text-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
        >
          <X className="size-4" />
          Xóa lọc
        </button>
      </div>

      {filteredConcerts.length > 0 ? (
        hasFilters ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredConcerts.map((concert) => (
              <ConcertCard key={concert.id} {...concert} />
            ))}
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(groupedConcerts).map(([groupName, list]) => (
              <ConcertRow key={groupName} groupName={groupName} list={list} />
            ))}
          </div>
        )
      ) : (
        <div className="rounded-[2rem] border border-dashed border-border bg-card p-10 text-center">
          <h3 className="text-2xl font-black text-foreground">Không tìm thấy sự kiện phù hợp</h3>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Thử đổi từ khóa, tỉnh/thành hoặc thể loại để xem thêm các show đang mở bán.
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
    </section>
  );
}
