"use client";

import { useEffect, useState } from 'react';
import { getProfile } from '@/lib/api';
import { NewsletterSignup } from './newsletter-signup';
import Link from 'next/link';
import { Ticket, Sparkles, Compass } from 'lucide-react';

export function HomeBanner() {
  const [session, setSession] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function checkUser() {
      try {
        const token = typeof window !== 'undefined' ? window.localStorage.getItem('access_token') : null;
        if (token) {
          const profile = await getProfile();
          setSession(profile);
        } else {
          setSession(null);
        }
      } catch (err: any) {
        if (err?.statusCode !== 401) {
          console.error('Failed to sync session on HomeBanner', err);
        }
        setSession(null);
      }
    }
    
    checkUser();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('ticketbox-auth-change', checkUser);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('ticketbox-auth-change', checkUser);
      }
    };
  }, []);

  // Before hydration, render the default newsletter signup to prevent layout shifts
  if (!mounted) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 rounded-[2rem] bg-foreground p-6 text-background md:grid-cols-[1fr_0.9fr] md:p-10">
          <div>
            <h2 className="max-w-xl text-3xl font-black tracking-tight md:text-4xl">Nhận thông báo khi show mới mở bán</h2>
            <p className="mt-3 max-w-lg text-background/65">Theo dõi lịch mở bán theo nghệ sĩ bạn quan tâm.</p>
          </div>
          <div className="min-h-12 w-full bg-white/10 rounded-full animate-pulse self-center" />
        </div>
      </section>
    );
  }

  if (session) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 rounded-[2rem] bg-gradient-to-r from-neutral-900 via-stone-900 to-zinc-950 p-6 text-white border border-white/5 md:grid-cols-[1.2fr_0.8fr] md:p-10 shadow-2xl relative overflow-hidden group">
          {/* Subtle glowing lights */}
          <div className="absolute -right-10 -top-10 size-48 rounded-full bg-primary/15 blur-[80px] group-hover:bg-primary/25 transition-all duration-700" />
          <div className="absolute -left-10 -bottom-10 size-48 rounded-full bg-emerald-500/10 blur-[80px] group-hover:bg-emerald-500/20 transition-all duration-700" />
          
          <div className="z-10 flex flex-col justify-center">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-primary backdrop-blur-md border border-white/10">
              <Sparkles className="size-3.5" />
              Trải nghiệm âm nhạc bất tận
            </div>
            <h2 className="max-w-xl text-3xl font-black tracking-tight md:text-4xl leading-tight">
              Khám phá những đêm nhạc bùng nổ dành riêng cho bạn!
            </h2>
            <p className="mt-3 max-w-lg text-sm text-neutral-300 leading-relaxed">
              Hãy cùng kết nối với hàng nghìn người hâm mộ và tận hưởng khoảnh khắc thăng hoa cảm xúc cùng các nghệ sĩ hàng đầu. Vé của bạn đã sẵn sàng để check-in!
            </p>
          </div>
          
          <div className="z-10 self-center flex flex-col sm:flex-row gap-4 w-full md:justify-end">
            <Link
              href="/my-tickets"
              className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-bold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90 active:translate-y-px cursor-pointer text-sm"
            >
              <Ticket className="size-4" />
              Vé của tôi
            </Link>
            <Link
              href="#events"
              className="flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3.5 font-bold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/20 active:translate-y-px cursor-pointer text-sm"
            >
              <Compass className="size-4 text-primary" />
              Khám phá show diễn
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Guest view
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid gap-8 rounded-[2rem] bg-foreground p-6 text-background md:grid-cols-[1fr_0.9fr] md:p-10">
        <div>
          <h2 className="max-w-xl text-3xl font-black tracking-tight md:text-4xl">Nhận thông báo khi show mới mở bán</h2>
          <p className="mt-3 max-w-lg text-background/65">Theo dõi lịch mở bán theo nghệ sĩ bạn quan tâm.</p>
        </div>
        <NewsletterSignup />
      </div>
    </section>
  );
}
