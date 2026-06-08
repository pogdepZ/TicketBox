"use client";

import { Bell, LogOut, Search, Ticket, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ThemeToggle } from './theme-toggle';
import { getCurrentMockSession, logoutMock, MockAuthSession } from '@/lib/mock-auth';

export function Header() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [session, setSession] = useState<MockAuthSession | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  useEffect(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (navigation?.type === 'reload') {
      setKeyword('');
      return;
    }

    setKeyword(new URLSearchParams(window.location.search).get('q') ?? '');
  }, []);

  useEffect(() => {
    function syncSession() {
      setSession(getCurrentMockSession());
    }

    syncSession();
    window.addEventListener('ticketbox-auth-change', syncSession);
    window.addEventListener('storage', syncSession);

    return () => {
      window.removeEventListener('ticketbox-auth-change', syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = keyword.trim();
    window.dispatchEvent(new CustomEvent('ticketbox-navbar-search', { detail: { query } }));
    router.push(query ? `/?q=${encodeURIComponent(query)}#events` : '/#events');
  }

  function handleLogout() {
    logoutMock();
    setShowAccount(false);
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-3 text-lg font-black tracking-tight text-foreground">
          <span className="grid size-10 place-items-center rounded-2xl bg-foreground text-background shadow-sm">
            <Ticket className="size-5" />
          </span>
          <span>TicketBox</span>
        </Link>

        <form onSubmit={handleSearch} className="hidden flex-1 md:flex" role="search">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm concert, nghệ sĩ, địa điểm"
              aria-label="Tìm kiếm sự kiện"
              className="h-11 w-full rounded-full border border-border bg-card pl-11 pr-4 text-sm shadow-sm transition focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/dashboard"
            className="hidden rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary sm:inline-flex"
          >
            Admin
          </Link>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications((current) => !current)}
              className="grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition hover:border-primary/40 hover:text-primary"
              aria-label="Thông báo"
            >
              <Bell className="size-5" />
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-12 z-50 w-80 rounded-3xl border border-border bg-card p-4 shadow-xl shadow-foreground/10">
                <p className="mb-3 font-black text-foreground">Thông báo</p>
                <div className="space-y-3 text-sm">
                  <div className="rounded-2xl bg-muted/70 p-3">
                    <p className="font-bold text-foreground">Vé VIP sắp hết</p>
                    <p className="mt-1 text-muted-foreground">Đêm Nhạc Ánh Sao chỉ còn một số ghế đẹp.</p>
                  </div>
                  <div className="rounded-2xl bg-muted/70 p-3">
                    <p className="font-bold text-foreground">Show mới mở bán</p>
                    <p className="mt-1 text-muted-foreground">Electric Summer Festival đã có lịch bán vé.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <ThemeToggle />
          {session ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAccount((current) => !current)}
                className="grid size-10 place-items-center rounded-full bg-foreground text-background transition hover:bg-primary"
                aria-label="Tài khoản"
              >
                <User className="size-5" />
              </button>
              {showAccount && (
                <div className="absolute right-0 top-12 z-50 w-72 rounded-3xl border border-border bg-card p-4 shadow-xl shadow-foreground/10">
                  <p className="font-black text-foreground">{session.user.fullName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{session.user.email}</p>
                  <div className="mt-3 rounded-2xl bg-muted/70 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {session.user.roles.map((role) => role.name).join(', ')}
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-bold text-foreground transition hover:border-destructive/40 hover:text-destructive"
                  >
                    <LogOut className="size-4" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="grid size-10 place-items-center rounded-full bg-foreground text-background transition hover:bg-primary"
              aria-label="Đăng nhập"
            >
              <User className="size-5" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
