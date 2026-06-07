import { Bell, Search, Ticket, User } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-3 text-lg font-black tracking-tight text-foreground">
          <span className="grid size-10 place-items-center rounded-2xl bg-foreground text-background shadow-sm">
            <Ticket className="size-5" />
          </span>
          <span>TicketBox</span>
        </Link>

        <div className="hidden flex-1 md:flex">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm concert, nghệ sĩ, địa điểm"
              className="h-11 w-full rounded-full border border-border bg-card pl-11 pr-4 text-sm shadow-sm transition focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/dashboard"
            className="hidden rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary sm:inline-flex"
          >
            Admin
          </Link>
          <button className="grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition hover:border-primary/40 hover:text-primary" aria-label="Thông báo">
            <Bell className="size-5" />
          </button>
          <ThemeToggle />
          <button className="grid size-10 place-items-center rounded-full bg-foreground text-background transition hover:bg-primary" aria-label="Tài khoản">
            <User className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
