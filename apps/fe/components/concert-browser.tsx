"use client";

import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
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
            Tìm show theo nghệ sĩ, địa điểm, thành phố hoặc thể loại bạn quan tâm.
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
          aria-label="Lọc theo thành phố"
          className="h-12 rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground transition focus:outline-none focus:ring-4 focus:ring-primary/15"
        >
          <option value="all">Tất cả thành phố</option>
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredConcerts.map((concert) => (
            <ConcertCard key={concert.id} {...concert} />
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-border bg-card p-10 text-center">
          <h3 className="text-2xl font-black text-foreground">Không tìm thấy sự kiện phù hợp</h3>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Thử đổi từ khóa, thành phố hoặc thể loại để xem thêm các show đang mở bán.
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
