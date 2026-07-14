"use client";

// tasteskill: Anti-Slop Frontend Skill - 3D Perspective Hover Card
// DESIGN_VARIANCE: 8 | MOTION_INTENSITY: 8 | VISUAL_DENSITY: 4
// Reading this as: Event ticket booking homepage for design-conscious consumers, with a premium cinematic/dark-tech vibe, leaning toward 3D parallax hover cards + smooth physics transitions.

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatViDate } from '@/lib/format';

interface ConcertItem {
  id: string;
  slug: string;
  title: string;
  artist: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  image: string;
  price: number;
  status: string;
  soldOut: boolean;
  createdAt?: string;
}

interface FeaturedCarouselProps {
  concerts: ConcertItem[];
}

export function FeaturedCarousel({ concerts }: FeaturedCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [playDirection, setPlayDirection] = useState<'forward' | 'backward'>('forward');
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sắp xếp lấy ra 5 concert được tạo mới nhất dựa trên createdAt
  const featuredConcerts = useMemo(() => {
    return [...concerts]
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [concerts]);

  const handleNext = () => {
    if (featuredConcerts.length <= 1) return;
    
    setActiveIndex((prev) => {
      if (playDirection === 'forward') {
        if (prev === featuredConcerts.length - 1) {
          setPlayDirection('backward');
          return prev - 1;
        }
        return prev + 1;
      } else {
        if (prev === 0) {
          setPlayDirection('forward');
          return prev + 1;
        }
        return prev - 1;
      }
    });
  };

  const handlePrev = () => {
    if (featuredConcerts.length <= 1) return;
    setActiveIndex((prev) => {
      if (prev === 0) {
        setPlayDirection('forward');
        return 1;
      }
      setPlayDirection('backward');
      return prev - 1;
    });
  };

  // Autoplay tịnh tiến qua lại
  useEffect(() => {
    if (isHovered || featuredConcerts.length <= 1) return;
    const interval = setInterval(handleNext, 5000);
    return () => clearInterval(interval);
  }, [isHovered, featuredConcerts.length, playDirection]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    const swipeThreshold = 50;

    if (diff > swipeThreshold) {
      handleNext();
    } else if (diff < -swipeThreshold) {
      handlePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // 3D Parallax Tilt Hover Handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    // Respect user's prefers-reduced-motion setting
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = card.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Mouse coordinates relative to card center (-0.5 to 0.5)
    const mouseX = (e.clientX - rect.left) / width - 0.5;
    const mouseY = (e.clientY - rect.top) / height - 0.5;

    // Max rotation angles (degrees)
    const maxRotateX = 12;
    const maxRotateY = 12;

    const rX = -mouseY * maxRotateX;
    const rY = mouseX * maxRotateY;

    card.style.setProperty('--rx', `${rX}deg`);
    card.style.setProperty('--ry', `${rY}deg`);

    // Shine coordinates (0% to 100%)
    const shineX = ((e.clientX - rect.left) / width) * 100;
    const shineY = ((e.clientY - rect.top) / height) * 100;
    card.style.setProperty('--mx', `${shineX}%`);
    card.style.setProperty('--my', `${shineY}%`);
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;

    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
    card.style.setProperty('--mx', '50%');
    card.style.setProperty('--my', '50%');
  };

  if (featuredConcerts.length === 0) return null;

  const activeConcert = featuredConcerts[activeIndex];

  return (
    <div
      className="relative group w-full mb-12 md:mb-24"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        handleMouseLeave();
      }}
    >
      {/* Slider Image Container with 3D Tilt Effect */}
      <div 
        ref={cardRef}
        className="hero-card-float relative overflow-hidden rounded-[2rem] border border-border bg-foreground shadow-2xl shadow-foreground/10 aspect-[16/11] transition-transform duration-200 ease-out"
        style={{
          transform: 'perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))',
          transformStyle: 'preserve-3d'
        }}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="relative h-full w-full"
          style={{ 
            transformStyle: 'preserve-3d'
          }}
        >
          {featuredConcerts.map((concert, index) => (
            <Link 
              key={concert.id}
              href={`/concert/${concert.slug}`}
              className={`absolute inset-0 w-full h-full block focus:outline-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                index === activeIndex 
                  ? 'opacity-100 scale-100 pointer-events-auto z-10' 
                  : 'opacity-0 scale-95 pointer-events-none z-0'
              }`}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Background Image - translateZ(0px) */}
              <div 
                className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.025]"
                style={{ transform: 'translateZ(0px)' }}
              >
                <Image
                  src={concert.image}
                  alt={concert.title}
                  fill
                  priority
                  loading="eager"
                  sizes="(min-width: 1024px) 56vw, 100vw"
                  className="object-cover"
                />
              </div>
              
              {/* Ambient Dark Gradient - translateZ(10px) */}
              <div 
                className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" 
                style={{ transform: 'translateZ(10px)' }}
              />
              
              {/* Concert Title & Artist Text: Floating in 3D parallax space - translateZ(40px) */}
              <div 
                className="absolute bottom-5 left-5 right-5 md:left-8 md:bottom-8 md:right-auto md:max-w-[calc(100%-360px)] text-white"
                style={{ transform: 'translateZ(40px)' }}
              >
                <p className="text-sm font-bold text-white/70">{concert.artist}</p>
                <h2 className="mt-1 text-2xl md:text-3xl font-black tracking-tight line-clamp-2 leading-tight">
                  {concert.title}
                </h2>
              </div>
            </Link>
          ))}
        </div>

        {/* 3D Shine Reflection Effect Overlay - translateZ(20px) */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-25 transition-opacity duration-300 z-10 mix-blend-color-dodge rounded-[2rem]"
          style={{
            background: 'radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255, 255, 255, 0.45) 0%, transparent 65%)',
            transform: 'translateZ(20px)'
          }}
        />

        {/* Navigation Dots - translateZ(30px) */}
        {featuredConcerts.length > 1 && (
          <div 
            className="absolute top-5 right-5 z-10 flex gap-1.5 bg-black/35 px-3 py-1.5 rounded-full backdrop-blur border border-white/10"
            style={{ transform: 'translateZ(30px)' }}
          >
            {featuredConcerts.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`size-2 rounded-full transition-all duration-300 ${
                  i === activeIndex ? 'bg-primary w-4' : 'bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Navigation Buttons - translateZ(30px) */}
        {featuredConcerts.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 size-10 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur border border-white/10 flex items-center justify-center transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
              style={{ transform: 'translateZ(30px)' }}
              aria-label="Previous slide"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 size-10 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur border border-white/10 flex items-center justify-center transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
              style={{ transform: 'translateZ(30px)' }}
              aria-label="Next slide"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {/* Floating Info Popup - positioned outside the aspect box to avoid clipping */}
      <Link 
        key={activeIndex} // Resetting key triggers the CSS entry animation automatically on change
        href={`/concert/${activeConcert.slug}`}
        className="block relative mt-6 left-0 right-0 rounded-3xl border border-border bg-card/95 p-5 shadow-xl shadow-foreground/10 backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 md:absolute md:-bottom-12 md:left-auto md:right-8 md:w-80 md:mt-0 animate-slide-in cursor-pointer z-20"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Featured ticket</p>
            <p className="mt-1 text-lg font-black text-foreground">{activeConcert.price.toLocaleString('vi-VN')}đ</p>
          </div>
          <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
            {activeConcert.status}
          </span>
        </div>
        <div className="grid gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            {formatViDate(activeConcert.date)} · {activeConcert.time}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" />
            {activeConcert.venue}, {activeConcert.city}
          </div>
        </div>
      </Link>
    </div>
  );
}

